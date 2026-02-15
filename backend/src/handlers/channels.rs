use axum::{extract::State, http::StatusCode, Json, http::HeaderMap};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{models::*, AppState};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

fn extract_user_id(headers: &HeaderMap) -> Result<Uuid, StatusCode> {
    let auth_header = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
    
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Uuid::parse_str(&token_data.claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)
}

pub async fn get_guild_channels(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<ChannelResponse>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    let channels = sqlx::query!(
        r#"
        SELECT id, guild_id, name, type as channel_type, position, created_at
        FROM channels
        WHERE guild_id = $1
        ORDER BY position, created_at
        "#,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<ChannelResponse> = channels
        .into_iter()
        .map(|c| ChannelResponse {
            id: c.id,
            guild_id: c.guild_id,
            name: c.name,
            channel_type: c.channel_type.unwrap_or_else(|| "text".to_string()),
            position: c.position.unwrap_or(0),
        })
        .collect();

    Ok(Json(response))
}

pub async fn create_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
    Json(payload): Json<CreateChannelRequest>,
) -> Result<Json<ChannelResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
    let guild = sqlx::query!(
        "SELECT owner_id FROM guilds WHERE id = $1",
        guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    if guild.owner_id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    let channel_id = Uuid::new_v4();

    sqlx::query!(
        "INSERT INTO channels (id, guild_id, name, type) VALUES ($1, $2, $3, $4)",
        channel_id,
        guild_id,
        payload.name,
        "text"
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ChannelResponse {
        id: channel_id,
        guild_id,
        name: payload.name,
        channel_type: "text".to_string(),
        position: 0,
    }))
}

pub async fn delete_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, channel_id)): axum::extract::Path<(Uuid, Uuid)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
    let guild = sqlx::query!(
        "SELECT owner_id FROM guilds WHERE id = $1",
        guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    if guild.owner_id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    sqlx::query!(
        "DELETE FROM channels WHERE id = $1 AND guild_id = $2",
        channel_id,
        guild_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
