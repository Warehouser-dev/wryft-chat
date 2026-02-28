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

    let secret = crate::JWT_SECRET;
    
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret),
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

    // Create @everyone role (default role for all members)
    let everyone_role_id = guild_id; // Use guild_id as the @everyone role id (Discord convention)
    sqlx::query!(
        "INSERT INTO roles (id, guild_id, name, color, position, permissions) VALUES ($1, $2, $3, $4, $5, $6)",
        everyone_role_id,
        guild_id,
        "@everyone",
        "#99aab5", // Default gray color
        0, // Lowest position
        0  // No special permissions by default
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create "Text Channels" category
    let text_category_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO channel_categories (id, guild_id, name, position) VALUES ($1, $2, $3, $4)",
        text_category_id,
        guild_id,
        "Text Channels",
        0
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create "Voice Channels" category
    let voice_category_id = Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO channel_categories (id, guild_id, name, position) VALUES ($1, $2, $3, $4)",
        voice_category_id,
        guild_id,
        "Voice Channels",
        1
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create default "general" text channel in Text Channels category
    sqlx::query!(
        "INSERT INTO channels (id, guild_id, name, channel_type, category_id, position) VALUES ($1, $2, $3, $4, $5, $6)",
        Uuid::new_v4(),
        guild_id,
        "general",
        "text",
        text_category_id,
        0
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create default "General" voice channel in Voice Channels category
    sqlx::query!(
        "INSERT INTO channels (id, guild_id, name, channel_type, category_id, position) VALUES ($1, $2, $3, $4, $5, $6)",
        Uuid::new_v4(),
        guild_id,
        "General",
        "voice",
        voice_category_id,
        0
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create default "Lounge" voice channel in Voice Channels category
    sqlx::query!(
        "INSERT INTO channels (id, guild_id, name, channel_type, category_id, position) VALUES ($1, $2, $3, $4, $5, $6)",
        Uuid::new_v4(),
        guild_id,
        "Lounge",
        "voice",
        voice_category_id,
        1
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
        banner_url: None,
        icon_url: None,
    }))
}

pub async fn get_user_guilds(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<GuildResponse>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let guilds = sqlx::query!(
        r#"
        SELECT g.id, g.name, g.owner_id, g.icon, g.created_at, g.banner_url, g.icon_url
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
            banner_url: g.banner_url,
            icon_url: g.icon_url,
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
        SELECT u.id, u.username, u.discriminator, u.email, up.status, up.last_seen
        FROM users u
        INNER JOIN guild_members gm ON u.id = gm.user_id
        LEFT JOIN user_presence up ON u.id = up.user_id
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
        .map(|m| {
            // A user is considered offline if they haven't been seen in the last 60 seconds
            let now = chrono::Utc::now();
            let last_seen = m.last_seen;
            let is_stale = last_seen.map(|ls| (now - ls).num_seconds() > 60).unwrap_or(true);
            
            let status = if is_stale { 
                "offline".to_string() 
            } else { 
                m.status.clone().unwrap_or_else(|| "offline".to_string()) 
            };

            MemberResponse {
                id: m.id,
                username: m.username.clone(),
                discriminator: m.discriminator.clone(),
                online: status == "online" || status == "focus" || status == "dnd" || status == "idle",
                status,
            }
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
        "SELECT id, name, owner_id, icon, created_at, banner_url, icon_url FROM guilds WHERE id = $1",
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
        banner_url: updated.banner_url,
        icon_url: updated.icon_url,
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


// Get public guilds for discovery
pub async fn get_public_guilds(
    State(state): State<AppState>,
) -> Result<Json<Vec<PublicGuildResponse>>, StatusCode> {
    let guilds = sqlx::query!(
        r#"
        SELECT 
            g.id, 
            g.name, 
            g.description, 
            g.icon, 
            g.icon_url,
            g.is_verified,
            COUNT(gm.user_id) as member_count
        FROM guilds g
        LEFT JOIN guild_members gm ON g.id = gm.guild_id
        WHERE g.is_public = TRUE
        GROUP BY g.id, g.name, g.description, g.icon, g.icon_url, g.is_verified
        ORDER BY g.is_verified DESC, member_count DESC
        LIMIT 50
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<PublicGuildResponse> = guilds
        .into_iter()
        .map(|g| PublicGuildResponse {
            id: g.id.to_string(),
            name: g.name,
            description: g.description,
            member_count: g.member_count.map(|c| c as i32),
            icon: g.icon,
            icon_url: g.icon_url,
            is_verified: g.is_verified.unwrap_or(false),
        })
        .collect();

    Ok(Json(response))
}

// Update guild settings (make public, add description)
pub async fn update_guild_settings(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<String>,
    Json(payload): Json<UpdateGuildSettingsRequest>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is owner
    let guild_uuid = Uuid::parse_str(&guild_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let guild = sqlx::query!(
        "SELECT owner_id FROM guilds WHERE id = $1",
        guild_uuid
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    if guild.owner_id != user_id {
        return Err(StatusCode::FORBIDDEN);
    }

    // Build update query dynamically based on what fields are provided
    if let Some(is_public) = payload.is_public {
        sqlx::query!(
            "UPDATE guilds SET is_public = $1 WHERE id = $2",
            is_public,
            guild_uuid
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(description) = payload.description {
        sqlx::query!(
            "UPDATE guilds SET description = $1 WHERE id = $2",
            description,
            guild_uuid
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(banner_url) = payload.banner_url {
        sqlx::query!(
            "UPDATE guilds SET banner_url = $1 WHERE id = $2",
            banner_url,
            guild_uuid
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(icon_url) = payload.icon_url {
        sqlx::query!(
            "UPDATE guilds SET icon_url = $1 WHERE id = $2",
            icon_url,
            guild_uuid
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    Ok(StatusCode::OK)
}

#[derive(Serialize)]
pub struct PublicGuildResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub member_count: Option<i32>,
    pub icon: String,
    pub icon_url: Option<String>,
    pub is_verified: bool,
}

#[derive(Deserialize)]
pub struct UpdateGuildSettingsRequest {
    pub is_public: Option<bool>,
    pub description: Option<String>,
    pub banner_url: Option<String>,
    pub icon_url: Option<String>,
}
