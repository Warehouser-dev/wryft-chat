use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;

#[derive(Serialize, Deserialize)]
pub struct DirectMessage {
    pub id: String,
    pub user1_id: String,
    pub user2_id: String,
    pub other_user: UserInfo,
}

#[derive(Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub discriminator: String,
    pub email: String,
}

#[derive(Serialize, Deserialize)]
pub struct DMMessage {
    pub id: String,
    pub dm_id: String,
    pub author_id: String,
    pub author: String,
    pub author_discriminator: String,
    pub text: String,
    pub edited_at: Option<String>,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct SendDMRequest {
    pub text: String,
}

#[derive(Deserialize)]
pub struct EditMessageRequest {
    pub text: String,
}

// Get or create DM conversation with another user
// For now, pass current_user_id as query param
pub async fn get_or_create_dm(
    State(state): State<AppState>,
    Path((current_user_id, other_user_id)): Path<(String, String)>,
) -> Result<Json<DirectMessage>, StatusCode> {
    let user_id = Uuid::parse_str(&current_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let other_id = Uuid::parse_str(&other_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    if user_id == other_id {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Ensure consistent ordering (smaller UUID first)
    let (uid1, uid2) = if user_id < other_id {
        (user_id, other_id)
    } else {
        (other_id, user_id)
    };

    // Try to get existing DM
    let existing = sqlx::query!(
        "SELECT id, user1_id, user2_id FROM direct_messages WHERE user1_id = $1 AND user2_id = $2",
        uid1,
        uid2
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let dm_id = if let Some(dm) = existing {
        dm.id
    } else {
        // Create new DM
        let new_id = Uuid::new_v4();
        sqlx::query!(
            "INSERT INTO direct_messages (id, user1_id, user2_id) VALUES ($1, $2, $3)",
            new_id,
            uid1,
            uid2
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        new_id
    };

    // Get other user info
    let other_user = sqlx::query!(
        "SELECT id, username, discriminator, email FROM users WHERE id = $1",
        other_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(DirectMessage {
        id: dm_id.to_string(),
        user1_id: uid1.to_string(),
        user2_id: uid2.to_string(),
        other_user: UserInfo {
            id: other_user.id.to_string(),
            username: other_user.username,
            discriminator: other_user.discriminator,
            email: other_user.email,
        },
    }))
}

// Get all DM conversations for current user
pub async fn get_user_dms(
    State(state): State<AppState>,
    Path(user_id_str): Path<String>,
) -> Result<Json<Vec<DirectMessage>>, StatusCode> {
    let user_id = Uuid::parse_str(&user_id_str).map_err(|_| StatusCode::BAD_REQUEST)?;

    let dms = sqlx::query!(
        r#"
        SELECT dm.id, dm.user1_id, dm.user2_id,
               u.id as other_id, u.username, u.discriminator, u.email
        FROM direct_messages dm
        JOIN users u ON (
            CASE 
                WHEN dm.user1_id = $1 THEN u.id = dm.user2_id
                ELSE u.id = dm.user1_id
            END
        )
        WHERE dm.user1_id = $1 OR dm.user2_id = $1
        ORDER BY dm.created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = dms
        .into_iter()
        .map(|dm| DirectMessage {
            id: dm.id.to_string(),
            user1_id: dm.user1_id.to_string(),
            user2_id: dm.user2_id.to_string(),
            other_user: UserInfo {
                id: dm.other_id.to_string(),
                username: dm.username,
                discriminator: dm.discriminator,
                email: dm.email,
            },
        })
        .collect();

    Ok(Json(result))
}

// Get messages in a DM
pub async fn get_dm_messages(
    State(state): State<AppState>,
    Path((user_id_str, dm_id)): Path<(String, String)>,
) -> Result<Json<Vec<DMMessage>>, StatusCode> {
    let user_id = Uuid::parse_str(&user_id_str).map_err(|_| StatusCode::BAD_REQUEST)?;
    let dm_uuid = Uuid::parse_str(&dm_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Verify user is part of this DM
    let dm = sqlx::query!(
        "SELECT user1_id, user2_id FROM direct_messages WHERE id = $1",
        dm_uuid
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    if dm.user1_id != user_id && dm.user2_id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    let messages = sqlx::query!(
        r#"
        SELECT m.id, m.dm_id, m.author_id, m.text, m.edited_at, m.created_at,
               u.username, u.discriminator
        FROM dm_messages m
        JOIN users u ON m.author_id = u.id
        WHERE m.dm_id = $1 AND m.deleted = false
        ORDER BY m.created_at ASC
        "#,
        dm_uuid
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = messages
        .into_iter()
        .map(|m| DMMessage {
            id: m.id.to_string(),
            dm_id: m.dm_id.to_string(),
            author_id: m.author_id.to_string(),
            author: m.username,
            author_discriminator: m.discriminator,
            text: m.text,
            edited_at: m.edited_at.map(|t| t.to_rfc3339()),
            created_at: m.created_at.unwrap().to_rfc3339(),
        })
        .collect();

    Ok(Json(result))
}

// Send a DM
pub async fn send_dm_message(
    State(state): State<AppState>,
    Path((user_id_str, dm_id)): Path<(String, String)>,
    Json(payload): Json<SendDMRequest>,
) -> Result<Json<DMMessage>, StatusCode> {
    let user_id = Uuid::parse_str(&user_id_str).map_err(|_| StatusCode::BAD_REQUEST)?;
    let dm_uuid = Uuid::parse_str(&dm_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Verify user is part of this DM
    let dm = sqlx::query!(
        "SELECT user1_id, user2_id FROM direct_messages WHERE id = $1",
        dm_uuid
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    if dm.user1_id != user_id && dm.user2_id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    let message_id = Uuid::new_v4();
    
    sqlx::query!(
        "INSERT INTO dm_messages (id, dm_id, author_id, text) VALUES ($1, $2, $3, $4)",
        message_id,
        dm_uuid,
        user_id,
        payload.text
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get user info
    let user = sqlx::query!(
        "SELECT username, discriminator FROM users WHERE id = $1",
        user_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(DMMessage {
        id: message_id.to_string(),
        dm_id: dm_id,
        author_id: user_id.to_string(),
        author: user.username,
        author_discriminator: user.discriminator,
        text: payload.text,
        edited_at: None,
        created_at: chrono::Utc::now().to_rfc3339(),
    }))
}

// Edit a DM message
pub async fn edit_dm_message(
    State(state): State<AppState>,
    Path((user_id_str, dm_id, message_id)): Path<(String, String, String)>,
    Json(payload): Json<EditMessageRequest>,
) -> Result<StatusCode, StatusCode> {
    let user_id = Uuid::parse_str(&user_id_str).map_err(|_| StatusCode::BAD_REQUEST)?;
    let message_uuid = Uuid::parse_str(&message_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let result = sqlx::query!(
        "UPDATE dm_messages SET text = $1, edited_at = NOW() WHERE id = $2 AND author_id = $3 AND deleted = false",
        payload.text,
        message_uuid,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::OK)
}

// Delete a DM message
pub async fn delete_dm_message(
    State(state): State<AppState>,
    Path((user_id_str, dm_id, message_id)): Path<(String, String, String)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = Uuid::parse_str(&user_id_str).map_err(|_| StatusCode::BAD_REQUEST)?;
    let message_uuid = Uuid::parse_str(&message_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let result = sqlx::query!(
        "UPDATE dm_messages SET deleted = true WHERE id = $1 AND author_id = $2",
        message_uuid,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::OK)
}
