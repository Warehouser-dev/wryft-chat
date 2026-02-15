use axum::{extract::{Path, State}, http::StatusCode, Json};
use uuid::Uuid;
use serde::Deserialize;

use crate::{models::*, AppState};

pub async fn get_messages(
    State(state): State<AppState>,
    Path(channel): Path<String>,
) -> Result<Json<Vec<Message>>, StatusCode> {
    let messages = sqlx::query!(
        "SELECT id, channel, author, author_discriminator, text, timestamp, edited_at FROM messages WHERE channel = $1 AND deleted = false ORDER BY created_at ASC",
        channel
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let result = messages.into_iter().map(|m| Message {
        id: m.id,
        channel: m.channel,
        author: m.author,
        author_discriminator: m.author_discriminator,
        text: m.text,
        timestamp: m.timestamp,
        edited: m.edited_at.is_some(),
    }).collect();
    
    Ok(Json(result))
}

pub async fn send_message(
    State(state): State<AppState>,
    Path(channel): Path<String>,
    Json(payload): Json<SendMessageRequest>,
) -> Result<Json<Message>, StatusCode> {
    let message_id = Uuid::new_v4();
    let timestamp = chrono::Utc::now().format("%I:%M %p").to_string();

    sqlx::query!(
        "INSERT INTO messages (id, channel, author, author_discriminator, text, timestamp) VALUES ($1, $2, $3, $4, $5, $6)",
        message_id,
        channel,
        payload.author,
        payload.author_discriminator,
        payload.text,
        timestamp
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(Message {
        id: message_id,
        channel,
        author: payload.author,
        author_discriminator: payload.author_discriminator,
        text: payload.text,
        timestamp,
        edited: false,
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

// Delete a message (simplified - no auth for now)
pub async fn delete_message(
    State(state): State<AppState>,
    Path((channel, message_id)): Path<(String, String)>,
) -> Result<StatusCode, StatusCode> {
    let message_uuid = Uuid::parse_str(&message_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let result = sqlx::query!(
        "UPDATE messages SET deleted = true WHERE id = $1",
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
