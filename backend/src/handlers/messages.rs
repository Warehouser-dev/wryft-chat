use axum::{extract::{Path, State}, http::StatusCode, Json};
use uuid::Uuid;

use crate::{models::*, AppState};

pub async fn get_messages(
    State(state): State<AppState>,
    Path(channel): Path<String>,
) -> Result<Json<Vec<Message>>, StatusCode> {
    let messages = sqlx::query_as!(
        Message,
        "SELECT id, channel, author, author_discriminator, text, timestamp FROM messages WHERE channel = $1 ORDER BY created_at ASC",
        channel
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(messages))
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
    }))
}
