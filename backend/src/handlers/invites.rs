use axum::{extract::State, http::StatusCode, Json, http::HeaderMap};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;

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

fn generate_invite_code() -> String {
    thread_rng()
        .sample_iter(&Alphanumeric)
        .take(8)
        .map(char::from)
        .collect()
}

pub async fn create_invite(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<InviteResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    let code = generate_invite_code();
    let invite_id = Uuid::new_v4();

    sqlx::query!(
        "INSERT INTO invites (id, guild_id, code, created_by) VALUES ($1, $2, $3, $4)",
        invite_id,
        guild_id,
        code,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(InviteResponse {
        code,
        guild_id,
    }))
}

pub async fn get_invite_info(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(code): axum::extract::Path<String>,
) -> Result<Json<InviteInfoResponse>, StatusCode> {
    let user_id = extract_user_id(&headers).ok();
    
    // Get invite
    let invite = sqlx::query!(
        "SELECT guild_id FROM invites WHERE code = $1",
        code
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    // Get guild info
    let guild = sqlx::query!(
        "SELECT id, name, icon, icon_url FROM guilds WHERE id = $1",
        invite.guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    // Get member count
    let member_count = sqlx::query!(
        "SELECT COUNT(*) as count FROM guild_members WHERE guild_id = $1",
        invite.guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Check if user is already a member
    let is_member = if let Some(uid) = user_id {
        sqlx::query!(
            "SELECT guild_id FROM guild_members WHERE guild_id = $1 AND user_id = $2",
            invite.guild_id,
            uid
        )
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .is_some()
    } else {
        false
    };

    Ok(Json(InviteInfoResponse {
        guild_id: guild.id,
        guild_name: guild.name,
        guild_icon: guild.icon,
        guild_icon_url: guild.icon_url,
        member_count: member_count.count.unwrap_or(0) as i32,
        is_member,
    }))
}

pub async fn join_guild(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(code): axum::extract::Path<String>,
) -> Result<Json<GuildResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Get invite
    let invite = sqlx::query!(
        "SELECT guild_id, uses, max_uses FROM invites WHERE code = $1",
        code
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    // Check if max uses reached
    if let Some(max_uses) = invite.max_uses {
        if invite.uses.unwrap_or(0) >= max_uses {
            return Err(StatusCode::GONE);
        }
    }

    // Check if already a member
    let existing = sqlx::query!(
        "SELECT guild_id FROM guild_members WHERE guild_id = $1 AND user_id = $2",
        invite.guild_id,
        user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing.is_none() {
        // Add user to guild
        sqlx::query!(
            "INSERT INTO guild_members (guild_id, user_id) VALUES ($1, $2)",
            invite.guild_id,
            user_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Increment uses
    sqlx::query!(
        "UPDATE invites SET uses = uses + 1 WHERE code = $1",
        code
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get guild info
    let guild = sqlx::query!(
        "SELECT id, name, owner_id, icon, created_at, banner_url, icon_url FROM guilds WHERE id = $1",
        invite.guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(GuildResponse {
        id: guild.id,
        name: guild.name,
        owner_id: guild.owner_id,
        icon: guild.icon,
        created_at: guild.created_at.map(|dt| dt.to_rfc3339()).unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
        banner_url: guild.banner_url,
        icon_url: guild.icon_url,
    }))
}

pub async fn leave_guild(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is the owner
    let guild = sqlx::query!(
        "SELECT owner_id FROM guilds WHERE id = $1",
        guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    if guild.owner_id == user_id {
        return Err(StatusCode::FORBIDDEN); // Owner can't leave, must delete server
    }

    // Remove user from guild
    sqlx::query!(
        "DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2",
        guild_id,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
