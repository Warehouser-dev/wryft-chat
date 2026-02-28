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
pub struct VoiceUser {
    pub id: String,
    pub username: String,
}

#[derive(Debug, Serialize)]
pub struct VoiceChannelUsers {
    pub channel_id: String,
    pub users: Vec<VoiceUser>,
}

pub async fn get_guild_voice_users(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<VoiceChannelUsers>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    // Clean up stale sessions (older than 30 seconds without update)
    let _ = sqlx::query!(
        "DELETE FROM voice_sessions WHERE joined_at < NOW() - INTERVAL '30 seconds'"
    )
    .execute(&state.db)
    .await;
    
    // Get all voice sessions for channels in this guild
    let sessions = sqlx::query!(
        r#"
        SELECT vs.channel_id, vs.user_id, u.username
        FROM voice_sessions vs
        JOIN channels c ON vs.channel_id = c.id
        JOIN users u ON vs.user_id = u.id
        WHERE c.guild_id = $1
        ORDER BY vs.joined_at
        "#,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Group by channel
    let mut channels_map: std::collections::HashMap<String, Vec<VoiceUser>> = std::collections::HashMap::new();
    
    for session in sessions {
        let channel_id = session.channel_id.to_string();
        let user = VoiceUser {
            id: session.user_id.to_string(),
            username: session.username,
        };
        
        channels_map.entry(channel_id).or_insert_with(Vec::new).push(user);
    }

    let result: Vec<VoiceChannelUsers> = channels_map
        .into_iter()
        .map(|(channel_id, users)| VoiceChannelUsers { channel_id, users })
        .collect();

    Ok(Json(result))
}

#[derive(Debug, Deserialize)]
pub struct JoinVoiceRequest {
    pub peer_id: String,
}

pub async fn join_voice_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(channel_id): axum::extract::Path<Uuid>,
    Json(payload): Json<JoinVoiceRequest>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Insert or update voice session
    sqlx::query!(
        r#"
        INSERT INTO voice_sessions (channel_id, user_id, peer_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (channel_id, user_id) 
        DO UPDATE SET peer_id = $3, joined_at = CURRENT_TIMESTAMP
        "#,
        channel_id,
        user_id,
        payload.peer_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}

#[derive(Debug, Deserialize)]
pub struct LeaveVoiceRequest {
    pub token: Option<String>,
}

pub async fn leave_voice_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(channel_id): axum::extract::Path<Uuid>,
    body: Option<Json<LeaveVoiceRequest>>,
) -> Result<StatusCode, StatusCode> {
    // Try to get user_id from header first, then from body token
    let user_id = match extract_user_id(&headers) {
        Ok(id) => id,
        Err(_) => {
            // Try to extract from body token
            if let Some(Json(req)) = body {
                if let Some(token) = req.token {
                    let secret = crate::JWT_SECRET;
                    let token_data = decode::<Claims>(
                        &token,
                        &DecodingKey::from_secret(secret),
                        &Validation::default(),
                    )
                    .map_err(|_| StatusCode::UNAUTHORIZED)?;
                    Uuid::parse_str(&token_data.claims.sub).map_err(|_| StatusCode::UNAUTHORIZED)?
                } else {
                    return Err(StatusCode::UNAUTHORIZED);
                }
            } else {
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    };
    
    sqlx::query!(
        "DELETE FROM voice_sessions WHERE channel_id = $1 AND user_id = $2",
        channel_id,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn heartbeat_voice_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(channel_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Update the joined_at timestamp to keep session alive
    sqlx::query!(
        "UPDATE voice_sessions SET joined_at = CURRENT_TIMESTAMP WHERE channel_id = $1 AND user_id = $2",
        channel_id,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
