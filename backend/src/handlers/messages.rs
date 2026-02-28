use axum::{extract::{Path, State}, http::StatusCode, Json};
use uuid::Uuid;
use serde::Deserialize;

use crate::{models::*, AppState};

pub async fn get_messages(
    State(state): State<AppState>,
    Path(channel): Path<String>,
) -> Result<Json<Vec<Message>>, StatusCode> {
    let messages = sqlx::query!(
        "SELECT id, channel, author, author_discriminator, author_id, text, timestamp, edited_at FROM messages WHERE channel = $1 AND deleted = false ORDER BY created_at ASC",
        channel
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Fetch all attachments for these messages
    let message_ids: Vec<Uuid> = messages.iter().map(|m| m.id).collect();
    
    let attachments = if !message_ids.is_empty() {
        sqlx::query!(
            "SELECT id, message_id, filename, file_url, file_type, file_size FROM message_attachments WHERE message_id = ANY($1)",
            &message_ids
        )
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
    } else {
        vec![]
    };
    
    let mut result = Vec::new();
    for m in messages {
        let msg_attachments: Vec<Attachment> = attachments
            .iter()
            .filter(|a| a.message_id == m.id)
            .map(|a| Attachment {
                id: a.id,
                filename: a.filename.clone(),
                file_url: a.file_url.clone(),
                file_type: a.file_type.clone(),
                file_size: a.file_size,
            })
            .collect();
            
        result.push(Message {
            id: m.id,
            channel: m.channel,
            author: m.author,
            author_discriminator: m.author_discriminator,
            author_id: m.author_id.map(|id| id.to_string()),
            text: m.text,
            timestamp: m.timestamp,
            edited: m.edited_at.is_some(),
            attachments: if msg_attachments.is_empty() { None } else { Some(msg_attachments) },
        });
    }
    
    Ok(Json(result))
}

pub async fn send_message(
    State(state): State<AppState>,
    Path(channel): Path<String>,
    Json(payload): Json<SendMessageRequest>,
) -> Result<Json<Message>, StatusCode> {
    let message_id = Uuid::new_v4();
    let timestamp = chrono::Utc::now().format("%I:%M %p").to_string();

    // Get author_id from username and discriminator
    let author_id = sqlx::query_scalar!(
        "SELECT id FROM users WHERE username = $1 AND discriminator = $2",
        payload.author,
        payload.author_discriminator
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user_id = author_id.ok_or(StatusCode::UNAUTHORIZED)?;

    // Parse channel ID and check permissions
    let channel_uuid = Uuid::parse_str(&channel).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    // Check if user has permission to send messages in this channel
    let can_send = crate::permissions::check_channel_permission(
        &state.db,
        user_id,
        channel_uuid,
        "send_messages"
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !can_send {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut tx = state.db.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query!(
        "INSERT INTO messages (id, channel, author, author_discriminator, author_id, text, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        message_id,
        channel,
        payload.author,
        payload.author_discriminator,
        Some(user_id),
        payload.text,
        timestamp
    )
    .execute(&mut *tx)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut saved_attachments = Vec::new();

    if let Some(attachments) = payload.attachments {
        for attachment in attachments {
            let attachment_id = Uuid::new_v4();
            sqlx::query!(
                "INSERT INTO message_attachments (id, message_id, filename, file_url, file_type, file_size) VALUES ($1, $2, $3, $4, $5, $6)",
                attachment_id,
                message_id,
                attachment.filename,
                attachment.file_url,
                attachment.file_type,
                attachment.file_size
            )
            .execute(&mut *tx)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            saved_attachments.push(Attachment {
                id: attachment_id,
                filename: attachment.filename.clone(),
                file_url: attachment.file_url.clone(),
                file_type: attachment.file_type.clone(),
                file_size: attachment.file_size,
            });
        }
    }

    tx.commit().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(Message {
        id: message_id,
        channel,
        author: payload.author,
        author_discriminator: payload.author_discriminator,
        author_id: Some(user_id.to_string()),
        text: payload.text,
        timestamp,
        edited: false,
        attachments: if saved_attachments.is_empty() { None } else { Some(saved_attachments) },
    }))
}

#[derive(Deserialize)]
pub struct EditMessageRequest {
    pub text: String,
}

// Edit a message (simplified - no auth for now)
pub async fn edit_message(
    State(state): State<AppState>,
    Path((channel, message_id)): Path<(String, String)>,
    Json(payload): Json<EditMessageRequest>,
) -> Result<StatusCode, StatusCode> {
    let message_uuid = Uuid::parse_str(&message_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let result = sqlx::query!(
        "UPDATE messages SET text = $1, edited_at = NOW() WHERE id = $2 AND deleted = false",
        payload.text,
        message_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::OK)
}

// Delete a message
pub async fn delete_message(
    State(state): State<AppState>,
    Path((channel, message_id)): Path<(String, String)>,
) -> Result<StatusCode, StatusCode> {
    let message_uuid = Uuid::parse_str(&message_id).map_err(|e| {
        eprintln!("Invalid message ID format: {:?}", e);
        StatusCode::BAD_REQUEST
    })?;

    // Get message details before deletion for audit log
    let message = sqlx::query!(
        "SELECT text, author_id, channel FROM messages WHERE id = $1 AND deleted = false",
        message_uuid
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        eprintln!("Database error fetching message: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if message.is_none() {
        eprintln!("Message not found: {}", message_id);
        return Err(StatusCode::NOT_FOUND);
    }

    let message = message.unwrap();

    let result = sqlx::query!(
        "UPDATE messages SET deleted = true WHERE id = $1",
        message_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|e| {
        eprintln!("Database error deleting message: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    // Get guild_id from channel
    let channel_uuid = Uuid::parse_str(&channel).ok();
    if let Some(channel_id) = channel_uuid {
        if let Ok(Some(guild_record)) = sqlx::query!(
            "SELECT guild_id FROM channels WHERE id = $1",
            channel_id
        )
        .fetch_optional(&state.db)
        .await
        {
            // Create audit log entry
            let details = serde_json::json!({
                "message_content": message.text,
                "channel_name": channel
            });
            
            let _ = crate::handlers::audit_logs::create_audit_log(
                &state.db,
                guild_record.guild_id,
                message.author_id,
                "message_delete",
                Some("message"),
                Some(message_uuid),
                Some(details)
            ).await;
        }
    }

    println!("✅ Message deleted successfully: {}", message_id);
    Ok(StatusCode::OK)
}
