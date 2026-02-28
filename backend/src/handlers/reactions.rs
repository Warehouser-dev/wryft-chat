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
pub struct ReactionResponse {
    pub id: String,
    pub message_id: String,
    pub user_id: String,
    pub emoji: String,
}

#[derive(Debug, Deserialize)]
pub struct AddReactionRequest {
    pub emoji: String,
}

// Add reaction to message
pub async fn add_reaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(message_id): axum::extract::Path<Uuid>,
    Json(payload): Json<AddReactionRequest>,
) -> Result<Json<ReactionResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let reaction_id = Uuid::new_v4();
    
    sqlx::query!(
        "INSERT INTO message_reactions (id, message_id, user_id, emoji) VALUES ($1, $2, $3, $4) ON CONFLICT (message_id, user_id, emoji) DO NOTHING",
        reaction_id,
        message_id,
        user_id,
        payload.emoji
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ReactionResponse {
        id: reaction_id.to_string(),
        message_id: message_id.to_string(),
        user_id: user_id.to_string(),
        emoji: payload.emoji,
    }))
}

// Remove reaction from message
pub async fn remove_reaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((message_id, emoji)): axum::extract::Path<(Uuid, String)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    sqlx::query!(
        "DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
        message_id,
        user_id,
        emoji
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Get reactions for a message
pub async fn get_message_reactions(
    State(state): State<AppState>,
    axum::extract::Path(message_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<ReactionResponse>>, StatusCode> {
    let reactions = sqlx::query!(
        "SELECT id, message_id, user_id, emoji FROM message_reactions WHERE message_id = $1",
        message_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = reactions.into_iter().map(|r| ReactionResponse {
        id: r.id.to_string(),
        message_id: r.message_id.to_string(),
        user_id: r.user_id.to_string(),
        emoji: r.emoji,
    }).collect();

    Ok(Json(result))
}

// DM Reactions
pub async fn add_dm_reaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(message_id): axum::extract::Path<Uuid>,
    Json(payload): Json<AddReactionRequest>,
) -> Result<Json<ReactionResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let reaction_id = Uuid::new_v4();
    
    sqlx::query!(
        "INSERT INTO dm_message_reactions (id, message_id, user_id, emoji) VALUES ($1, $2, $3, $4) ON CONFLICT (message_id, user_id, emoji) DO NOTHING",
        reaction_id,
        message_id,
        user_id,
        payload.emoji
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ReactionResponse {
        id: reaction_id.to_string(),
        message_id: message_id.to_string(),
        user_id: user_id.to_string(),
        emoji: payload.emoji,
    }))
}

pub async fn remove_dm_reaction(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((message_id, emoji)): axum::extract::Path<(Uuid, String)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    sqlx::query!(
        "DELETE FROM dm_message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
        message_id,
        user_id,
        emoji
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_dm_message_reactions(
    State(state): State<AppState>,
    axum::extract::Path(message_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<ReactionResponse>>, StatusCode> {
    let reactions = sqlx::query!(
        "SELECT id, message_id, user_id, emoji FROM dm_message_reactions WHERE message_id = $1",
        message_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = reactions.into_iter().map(|r| ReactionResponse {
        id: r.id.to_string(),
        message_id: r.message_id.to_string(),
        user_id: r.user_id.to_string(),
        emoji: r.emoji,
    }).collect();

    Ok(Json(result))
}
