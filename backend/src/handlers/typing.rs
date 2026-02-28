use axum::{extract::State, http::StatusCode, Json, http::HeaderMap};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;

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

    let secret = crate::JWT_SECRET;
    
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Uuid::parse_str(&token_data.claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)
}

#[derive(Debug, Serialize)]
pub struct TypingUser {
    pub user_id: String,
    pub username: String,
}

// Start typing in channel
pub async fn start_typing(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(channel_id): axum::extract::Path<String>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Get username
    let user = sqlx::query!("SELECT username FROM users WHERE id = $1", user_id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Clean up old typing indicators (older than 10 seconds)
    let _ = sqlx::query!(
        "DELETE FROM typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds'"
    )
    .execute(&state.db)
    .await;
    
    sqlx::query!(
        "INSERT INTO typing_indicators (channel_id, user_id, username) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (channel_id, user_id) 
         DO UPDATE SET started_at = NOW()",
        channel_id,
        user_id,
        user.username
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Stop typing in channel
pub async fn stop_typing(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(channel_id): axum::extract::Path<String>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    sqlx::query!(
        "DELETE FROM typing_indicators WHERE channel_id = $1 AND user_id = $2",
        channel_id,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Get who's typing in channel
pub async fn get_typing_users(
    State(state): State<AppState>,
    axum::extract::Path(channel_id): axum::extract::Path<String>,
) -> Result<Json<Vec<TypingUser>>, StatusCode> {
    // Clean up old typing indicators
    let _ = sqlx::query!(
        "DELETE FROM typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds'"
    )
    .execute(&state.db)
    .await;
    
    let typing = sqlx::query!(
        "SELECT user_id, username FROM typing_indicators WHERE channel_id = $1",
        channel_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = typing.into_iter().map(|t| TypingUser {
        user_id: t.user_id.to_string(),
        username: t.username,
    }).collect();

    Ok(Json(result))
}

// DM typing indicators
pub async fn start_dm_typing(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(dm_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let user = sqlx::query!("SELECT username FROM users WHERE id = $1", user_id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let _ = sqlx::query!(
        "DELETE FROM dm_typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds'"
    )
    .execute(&state.db)
    .await;
    
    sqlx::query!(
        "INSERT INTO dm_typing_indicators (dm_id, user_id, username) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (dm_id, user_id) 
         DO UPDATE SET started_at = NOW()",
        dm_id,
        user_id,
        user.username
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn stop_dm_typing(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(dm_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    sqlx::query!(
        "DELETE FROM dm_typing_indicators WHERE dm_id = $1 AND user_id = $2",
        dm_id,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_dm_typing_users(
    State(state): State<AppState>,
    axum::extract::Path(dm_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<TypingUser>>, StatusCode> {
    let _ = sqlx::query!(
        "DELETE FROM dm_typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds'"
    )
    .execute(&state.db)
    .await;
    
    let typing = sqlx::query!(
        "SELECT user_id, username FROM dm_typing_indicators WHERE dm_id = $1",
        dm_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = typing.into_iter().map(|t| TypingUser {
        user_id: t.user_id.to_string(),
        username: t.username,
    }).collect();

    Ok(Json(result))
}
