use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use crate::AppState;

#[derive(Serialize)]
pub struct CustomEmoji {
    pub id: String,
    pub guild_id: String,
    pub name: String,
    pub image_url: String,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Deserialize)]
pub struct CreateEmojiRequest {
    pub name: String,
    pub image_url: String,
    pub created_by: String,  // User ID who is creating the emoji
}

// Get all custom emoji for a guild
pub async fn get_guild_emoji(
    State(state): State<AppState>,
    Path(guild_id): Path<String>,
) -> Result<Json<Vec<CustomEmoji>>, StatusCode> {
    let guild_uuid = uuid::Uuid::parse_str(&guild_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    let emoji = sqlx::query!(
        r#"
        SELECT id, guild_id, name, image_url, created_by, created_at
        FROM custom_emoji
        WHERE guild_id = $1
        ORDER BY name ASC
        "#,
        guild_uuid
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let emoji_list = emoji.into_iter().map(|e| CustomEmoji {
        id: e.id.to_string(),
        guild_id: e.guild_id.to_string(),
        name: e.name,
        image_url: e.image_url,
        created_by: e.created_by.to_string(),
        created_at: e.created_at.map(|dt| dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()).unwrap_or_default(),
    }).collect();

    Ok(Json(emoji_list))
}

// Create custom emoji
pub async fn create_emoji(
    State(state): State<AppState>,
    Path(guild_id): Path<String>,
    Json(payload): Json<CreateEmojiRequest>,
) -> Result<Json<CustomEmoji>, StatusCode> {
    let guild_uuid = uuid::Uuid::parse_str(&guild_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let user_uuid = uuid::Uuid::parse_str(&payload.created_by).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Validate emoji name (alphanumeric and underscores only, 2-32 chars)
    if !payload.name.chars().all(|c| c.is_alphanumeric() || c == '_') || payload.name.len() < 2 || payload.name.len() > 32 {
        return Err(StatusCode::BAD_REQUEST);
    }

    let emoji = sqlx::query!(
        r#"
        INSERT INTO custom_emoji (guild_id, name, image_url, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, guild_id, name, image_url, created_by, created_at
        "#,
        guild_uuid,
        payload.name,
        payload.image_url,
        user_uuid
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        eprintln!("Error creating emoji: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(CustomEmoji {
        id: emoji.id.to_string(),
        guild_id: emoji.guild_id.to_string(),
        name: emoji.name,
        image_url: emoji.image_url,
        created_by: emoji.created_by.to_string(),
        created_at: emoji.created_at.map(|dt| dt.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()).unwrap_or_default(),
    }))
}

// Delete custom emoji
pub async fn delete_emoji(
    State(state): State<AppState>,
    Path((guild_id, emoji_id)): Path<(String, String)>,
) -> Result<StatusCode, StatusCode> {
    let guild_uuid = uuid::Uuid::parse_str(&guild_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let emoji_uuid = uuid::Uuid::parse_str(&emoji_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    sqlx::query!(
        "DELETE FROM custom_emoji WHERE id = $1 AND guild_id = $2",
        emoji_uuid,
        guild_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
