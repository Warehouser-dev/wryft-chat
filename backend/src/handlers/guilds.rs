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

pub async fn create_guild(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<CreateGuildRequest>,
) -> Result<Json<GuildResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let guild_id = Uuid::new_v4();
    let icon = payload.name.chars().take(2).collect::<String>().to_uppercase();
    let created_at = chrono::Utc::now().to_rfc3339();

    sqlx::query!(
        "INSERT INTO guilds (id, name, owner_id, icon, created_at) VALUES ($1, $2, $3, $4, $5)",
        guild_id,
        payload.name,
        user_id,
        icon,
        chrono::Utc::now()
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query!(
        "INSERT INTO guild_members (guild_id, user_id) VALUES ($1, $2)",
        guild_id,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create default "general" channel
    sqlx::query!(
        "INSERT INTO channels (id, guild_id, name, type) VALUES ($1, $2, $3, $4)",
        Uuid::new_v4(),
        guild_id,
        "general",
        "text"
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(GuildResponse {
        id: guild_id,
        name: payload.name,
        owner_id: user_id,
        icon,
        created_at,
    }))
}

pub async fn get_user_guilds(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<GuildResponse>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let guilds = sqlx::query!(
        r#"
        SELECT g.id, g.name, g.owner_id, g.icon, g.created_at
        FROM guilds g
        INNER JOIN guild_members gm ON g.id = gm.guild_id
        WHERE gm.user_id = $1
        ORDER BY g.created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<GuildResponse> = guilds
        .into_iter()
        .map(|g| GuildResponse {
            id: g.id,
            name: g.name,
            owner_id: g.owner_id,
            icon: g.icon,
            created_at: g.created_at.map(|dt| dt.to_rfc3339()).unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
        })
        .collect();

    Ok(Json(response))
}

pub async fn get_guild_members(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<MemberResponse>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    let members = sqlx::query!(
        r#"
        SELECT u.id, u.username, u.discriminator, u.email
        FROM users u
        INNER JOIN guild_members gm ON u.id = gm.user_id
        WHERE gm.guild_id = $1
        ORDER BY u.username
        "#,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<MemberResponse> = members
        .into_iter()
        .map(|m| MemberResponse {
            id: m.id,
            username: m.username,
            discriminator: m.discriminator,
            online: true, // TODO: Track actual online status
        })
        .collect();

    Ok(Json(response))
}

pub async fn update_guild(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
    Json(payload): Json<UpdateGuildRequest>,
) -> Result<Json<GuildResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is owner
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

    let icon = payload.name.chars().take(2).collect::<String>().to_uppercase();

    sqlx::query!(
        "UPDATE guilds SET name = $1, icon = $2 WHERE id = $3",
        payload.name,
        icon,
        guild_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let updated = sqlx::query!(
        "SELECT id, name, owner_id, icon, created_at FROM guilds WHERE id = $1",
        guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(GuildResponse {
        id: updated.id,
        name: updated.name,
        owner_id: updated.owner_id,
        icon: updated.icon,
        created_at: updated.created_at.map(|dt| dt.to_rfc3339()).unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
    }))
}

pub async fn delete_guild(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is owner
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
        "DELETE FROM guilds WHERE id = $1",
        guild_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
