use axum::{extract::State, http::StatusCode, Json, http::HeaderMap};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;

use crate::AppState;
use crate::handlers::websocket::WsMessage;

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
pub struct PresenceResponse {
    pub user_id: String,
    pub status: String,
    pub last_seen: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePresenceRequest {
    pub status: String, // online, idle, dnd, offline
}

// Update user presence
pub async fn update_presence(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdatePresenceRequest>,
) -> Result<Json<PresenceResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let now = chrono::Utc::now();
    
    sqlx::query!(
        "INSERT INTO user_presence (user_id, status, last_seen, updated_at) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id) 
         DO UPDATE SET status = $2, last_seen = $3, updated_at = $4",
        user_id,
        payload.status,
        now,
        now
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update cache if available
    if let Some(cache) = &state.cache {
        if let Err(e) = cache.set_presence(&user_id.to_string(), &payload.status, 90).await {
            eprintln!("Failed to update cache: {}", e);
            // Continue anyway - cache failure shouldn't break the request
        }
    }

    // Broadcast presence update
    let broadcast_msg = WsMessage::PresenceUpdate {
        user_id: user_id.to_string(),
        status: payload.status.clone(),
    };
    state.ws_state.broadcast_to_all(&serde_json::to_string(&broadcast_msg).unwrap()).await;

    Ok(Json(PresenceResponse {
        user_id: user_id.to_string(),
        status: payload.status,
        last_seen: now.to_rfc3339(),
    }))
}

// Get user presence
pub async fn get_user_presence(
    State(state): State<AppState>,
    axum::extract::Path(user_id): axum::extract::Path<Uuid>,
) -> Result<Json<PresenceResponse>, StatusCode> {
    let presence = sqlx::query!(
        "SELECT user_id, status, last_seen FROM user_presence WHERE user_id = $1",
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match presence {
        Some(p) => {
            let last_seen = p.last_seen.unwrap_or_else(chrono::Utc::now);
            let now = chrono::Utc::now();
            let duration = now.signed_duration_since(last_seen);
            let seconds_since_seen = duration.num_seconds();
            
            // Consider offline if no heartbeat for more than 60 seconds
            let status = if seconds_since_seen > 60 { 
                "offline".to_string() 
            } else { 
                p.status.unwrap_or_else(|| "offline".to_string()) 
            };

            println!("User {} presence: status={}, last_seen={}, seconds_ago={}", 
                user_id, status, last_seen, seconds_since_seen);

            Ok(Json(PresenceResponse {
                user_id: p.user_id.to_string(),
                status,
                last_seen: last_seen.to_rfc3339(),
            }))
        },
        None => {
            println!("User {} has no presence record, returning offline", user_id);
            Ok(Json(PresenceResponse {
                user_id: user_id.to_string(),
                status: "offline".to_string(),
                last_seen: chrono::Utc::now().to_rfc3339(),
            }))
        }
    }
}

// Get presence for multiple users (for guild members)
pub async fn get_guild_presence(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<PresenceResponse>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    let presences = sqlx::query!(
        r#"
        SELECT up.user_id, up.status, up.last_seen
        FROM user_presence up
        JOIN guild_members gm ON up.user_id = gm.user_id
        WHERE gm.guild_id = $1
        "#,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = presences.into_iter().map(|p| PresenceResponse {
        user_id: p.user_id.to_string(),
        status: p.status.unwrap_or_else(|| "offline".to_string()),
        last_seen: p.last_seen.unwrap_or_else(chrono::Utc::now).to_rfc3339(),
    }).collect();

    Ok(Json(result))
}

// Heartbeat to keep user online
pub async fn heartbeat(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let now = chrono::Utc::now();
    
    sqlx::query!(
        "INSERT INTO user_presence (user_id, status, last_seen, updated_at) 
         VALUES ($1, 'online', $2, $3) 
         ON CONFLICT (user_id) 
         DO UPDATE SET last_seen = $2, updated_at = $3",
        user_id,
        now,
        now
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update cache if available
    if let Some(cache) = &state.cache {
        if let Err(e) = cache.set_presence(&user_id.to_string(), "online", 90).await {
            eprintln!("Failed to update cache: {}", e);
        }
    }

    Ok(StatusCode::NO_CONTENT)
}

// Get bulk presence for multiple users (OPTIMIZED FOR SCALE)
#[derive(Debug, Deserialize)]
pub struct BulkPresenceRequest {
    pub user_ids: Vec<String>,
}

pub async fn get_bulk_presence(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<BulkPresenceRequest>,
) -> Result<Json<HashMap<String, String>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    // Limit to 100 users per request to prevent abuse
    if payload.user_ids.len() > 100 {
        println!("Bulk presence request rejected: {} users requested (max 100)", payload.user_ids.len());
        return Err(StatusCode::BAD_REQUEST);
    }
    
    if payload.user_ids.is_empty() {
        return Ok(Json(HashMap::new()));
    }
    
    println!("Bulk presence request for {} users", payload.user_ids.len());
    
    let mut result = HashMap::new();
    let mut cache_misses = Vec::new();
    
    // Try cache first if available
    if let Some(cache) = &state.cache {
        match cache.get_bulk_presence(&payload.user_ids).await {
            Ok(cached_results) => {
                for (i, user_id) in payload.user_ids.iter().enumerate() {
                    if let Some(Some(status)) = cached_results.get(i) {
                        result.insert(user_id.clone(), status.clone());
                    } else {
                        cache_misses.push(user_id.clone());
                    }
                }
                println!("Cache hits: {}, misses: {}", result.len(), cache_misses.len());
            }
            Err(e) => {
                eprintln!("Cache lookup failed: {}, falling back to DB", e);
                cache_misses = payload.user_ids.clone();
            }
        }
    } else {
        // No cache, query all from DB
        cache_misses = payload.user_ids.clone();
    }
    
    // Query database for cache misses
    if !cache_misses.is_empty() {
        let user_ids: Vec<Uuid> = cache_misses
            .iter()
            .filter_map(|id| Uuid::parse_str(id).ok())
            .collect();
        
        if !user_ids.is_empty() {
            let presences = sqlx::query!(
                r#"
                SELECT user_id, status, last_seen
                FROM user_presence
                WHERE user_id = ANY($1)
                "#,
                &user_ids
            )
            .fetch_all(&state.db)
            .await
            .map_err(|e| {
                eprintln!("Bulk presence query failed: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            
            let now = chrono::Utc::now();
            
            // Process DB results
            for p in presences {
                let last_seen = p.last_seen.unwrap_or_else(chrono::Utc::now);
                let duration = now.signed_duration_since(last_seen);
                let seconds_since = duration.num_seconds();
                
                let status = if seconds_since > 60 {
                    "offline".to_string()
                } else {
                    p.status.unwrap_or_else(|| "offline".to_string())
                };
                
                let user_id_str = p.user_id.to_string();
                result.insert(user_id_str.clone(), status.clone());
                
                // Update cache with DB result
                if let Some(cache) = &state.cache {
                    if let Err(e) = cache.set_presence(&user_id_str, &status, 90).await {
                        eprintln!("Failed to cache presence: {}", e);
                    }
                }
            }
        }
        
        // Add offline for users not in database
        for user_id in cache_misses {
            result.entry(user_id.clone())
                .or_insert_with(|| {
                    // Cache the offline status too
                    if let Some(cache) = &state.cache {
                        let _ = tokio::spawn({
                            let cache = cache.clone();
                            let user_id = user_id.clone();
                            async move {
                                let _ = cache.set_presence(&user_id, "offline", 90).await;
                            }
                        });
                    }
                    "offline".to_string()
                });
        }
    }
    
    println!("Bulk presence returned {} statuses", result.len());
    
    Ok(Json(result))
}
