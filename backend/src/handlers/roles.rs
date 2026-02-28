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

// Permission constants
pub const ADMINISTRATOR: i64 = 0x0001;
pub const MANAGE_GUILD: i64 = 0x0002;
pub const MANAGE_ROLES: i64 = 0x0004;
pub const MANAGE_CHANNELS: i64 = 0x0008;
pub const KICK_MEMBERS: i64 = 0x0010;
pub const BAN_MEMBERS: i64 = 0x0020;
pub const CREATE_INVITE: i64 = 0x0040;
pub const MANAGE_MESSAGES: i64 = 0x0080;
pub const SEND_MESSAGES: i64 = 0x0100;
pub const READ_MESSAGES: i64 = 0x0200;
pub const MENTION_EVERYONE: i64 = 0x0400;
pub const MANAGE_NICKNAMES: i64 = 0x0800;
pub const CONNECT_VOICE: i64 = 0x1000;
pub const SPEAK_VOICE: i64 = 0x2000;
pub const MUTE_MEMBERS: i64 = 0x4000;
pub const DEAFEN_MEMBERS: i64 = 0x8000;

// Default permissions for @everyone role
pub const DEFAULT_PERMISSIONS: i64 = SEND_MESSAGES | READ_MESSAGES | CREATE_INVITE | CONNECT_VOICE | SPEAK_VOICE;

#[derive(Debug, Serialize)]
pub struct RoleResponse {
    pub id: Uuid,
    pub guild_id: Uuid,
    pub name: String,
    pub color: String,
    pub position: i32,
    pub permissions: i64,
    pub mentionable: bool,
    pub hoist: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoleRequest {
    pub name: String,
    pub color: Option<String>,
    pub permissions: Option<i64>,
    pub mentionable: Option<bool>,
    pub hoist: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRoleRequest {
    pub name: Option<String>,
    pub color: Option<String>,
    pub position: Option<i32>,
    pub permissions: Option<i64>,
    pub mentionable: Option<bool>,
    pub hoist: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AssignRoleRequest {
    pub user_id: String,
}

// Check if user has permission in guild
async fn has_permission(
    state: &AppState,
    user_id: Uuid,
    guild_id: Uuid,
    required_permission: i64,
) -> Result<bool, StatusCode> {
    // Check if user is guild owner
    let guild = sqlx::query!(
        "SELECT owner_id FROM guilds WHERE id = $1",
        guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    if guild.owner_id == user_id {
        return Ok(true);
    }

    // Get user's roles and check permissions
    let roles = sqlx::query!(
        r#"
        SELECT r.permissions
        FROM roles r
        INNER JOIN role_members rm ON r.id = rm.role_id
        WHERE rm.user_id = $1 AND rm.guild_id = $2
        "#,
        user_id,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    for role in roles {
        let perms = role.permissions;
        // Administrator has all permissions
        if perms & ADMINISTRATOR != 0 {
            return Ok(true);
        }
        // Check specific permission
        if perms & required_permission != 0 {
            return Ok(true);
        }
    }

    Ok(false)
}

// Create a new role
pub async fn create_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
    Json(payload): Json<CreateRoleRequest>,
) -> Result<Json<RoleResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check permission
    if !has_permission(&state, user_id, guild_id, MANAGE_ROLES).await? {
        return Err(StatusCode::FORBIDDEN);
    }

    let role_id = Uuid::new_v4();
    let color = payload.color.unwrap_or_else(|| "#99aab5".to_string());
    let permissions = payload.permissions.unwrap_or(DEFAULT_PERMISSIONS);
    let mentionable = payload.mentionable.unwrap_or(true);
    let hoist = payload.hoist.unwrap_or(false);

    // Get max position and add 1
    let max_position = sqlx::query!(
        "SELECT COALESCE(MAX(position), 0) as max_pos FROM roles WHERE guild_id = $1",
        guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let position = max_position.max_pos.unwrap_or(0) + 1;

    sqlx::query!(
        r#"
        INSERT INTO roles (id, guild_id, name, color, position, permissions, mentionable, hoist)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        "#,
        role_id,
        guild_id,
        payload.name,
        color,
        position,
        permissions,
        mentionable,
        hoist
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(RoleResponse {
        id: role_id,
        guild_id,
        name: payload.name,
        color,
        position,
        permissions,
        mentionable,
        hoist,
    }))
}

// Get all roles for a guild
pub async fn get_guild_roles(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<RoleResponse>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    let roles = sqlx::query!(
        r#"
        SELECT id, guild_id, name, color, position, permissions, mentionable, hoist
        FROM roles
        WHERE guild_id = $1
        ORDER BY position DESC
        "#,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<RoleResponse> = roles
        .into_iter()
        .map(|r| RoleResponse {
            id: r.id,
            guild_id: r.guild_id,
            name: r.name,
            color: r.color.unwrap_or_else(|| "#99aab5".to_string()),
            position: r.position,
            permissions: r.permissions,
            mentionable: r.mentionable.unwrap_or(true),
            hoist: r.hoist.unwrap_or(false),
        })
        .collect();

    Ok(Json(response))
}

// Update a role
pub async fn update_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, role_id)): axum::extract::Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateRoleRequest>,
) -> Result<Json<RoleResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check permission
    if !has_permission(&state, user_id, guild_id, MANAGE_ROLES).await? {
        return Err(StatusCode::FORBIDDEN);
    }

    // Update fields individually
    if let Some(name) = payload.name {
        sqlx::query!(
            "UPDATE roles SET name = $1 WHERE id = $2 AND guild_id = $3",
            name,
            role_id,
            guild_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(color) = payload.color {
        sqlx::query!(
            "UPDATE roles SET color = $1 WHERE id = $2 AND guild_id = $3",
            color,
            role_id,
            guild_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(position) = payload.position {
        sqlx::query!(
            "UPDATE roles SET position = $1 WHERE id = $2 AND guild_id = $3",
            position,
            role_id,
            guild_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(permissions) = payload.permissions {
        sqlx::query!(
            "UPDATE roles SET permissions = $1 WHERE id = $2 AND guild_id = $3",
            permissions,
            role_id,
            guild_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(mentionable) = payload.mentionable {
        sqlx::query!(
            "UPDATE roles SET mentionable = $1 WHERE id = $2 AND guild_id = $3",
            mentionable,
            role_id,
            guild_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(hoist) = payload.hoist {
        sqlx::query!(
            "UPDATE roles SET hoist = $1 WHERE id = $2 AND guild_id = $3",
            hoist,
            role_id,
            guild_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Fetch updated role
    let role = sqlx::query!(
        r#"
        SELECT id, guild_id, name, color, position, permissions, mentionable, hoist
        FROM roles
        WHERE id = $1 AND guild_id = $2
        "#,
        role_id,
        guild_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(RoleResponse {
        id: role.id,
        guild_id: role.guild_id,
        name: role.name,
        color: role.color.unwrap_or_else(|| "#99aab5".to_string()),
        position: role.position,
        permissions: role.permissions,
        mentionable: role.mentionable.unwrap_or(true),
        hoist: role.hoist.unwrap_or(false),
    }))
}

// Delete a role
pub async fn delete_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, role_id)): axum::extract::Path<(Uuid, Uuid)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check permission
    if !has_permission(&state, user_id, guild_id, MANAGE_ROLES).await? {
        return Err(StatusCode::FORBIDDEN);
    }

    sqlx::query!(
        "DELETE FROM roles WHERE id = $1 AND guild_id = $2",
        role_id,
        guild_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Assign role to user
pub async fn assign_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, role_id)): axum::extract::Path<(Uuid, Uuid)>,
    Json(payload): Json<AssignRoleRequest>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check permission
    if !has_permission(&state, user_id, guild_id, MANAGE_ROLES).await? {
        return Err(StatusCode::FORBIDDEN);
    }

    let target_user_id = Uuid::parse_str(&payload.user_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Check if user is in guild
    let member = sqlx::query!(
        "SELECT user_id FROM guild_members WHERE guild_id = $1 AND user_id = $2",
        guild_id,
        target_user_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if member.is_none() {
        return Err(StatusCode::NOT_FOUND);
    }

    // Assign role
    sqlx::query!(
        r#"
        INSERT INTO role_members (role_id, user_id, guild_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (role_id, user_id, guild_id) DO NOTHING
        "#,
        role_id,
        target_user_id,
        guild_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}

// Remove role from user
pub async fn remove_role(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, role_id, user_id_str)): axum::extract::Path<(Uuid, Uuid, String)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check permission
    if !has_permission(&state, user_id, guild_id, MANAGE_ROLES).await? {
        return Err(StatusCode::FORBIDDEN);
    }

    let target_user_id = Uuid::parse_str(&user_id_str).map_err(|_| StatusCode::BAD_REQUEST)?;

    sqlx::query!(
        "DELETE FROM role_members WHERE role_id = $1 AND user_id = $2 AND guild_id = $3",
        role_id,
        target_user_id,
        guild_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Get user's roles in a guild
pub async fn get_user_roles(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, user_id_str)): axum::extract::Path<(Uuid, String)>,
) -> Result<Json<Vec<RoleResponse>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    let target_user_id = Uuid::parse_str(&user_id_str).map_err(|_| StatusCode::BAD_REQUEST)?;

    let roles = sqlx::query!(
        r#"
        SELECT r.id, r.guild_id, r.name, r.color, r.position, r.permissions, r.mentionable, r.hoist
        FROM roles r
        INNER JOIN role_members rm ON r.id = rm.role_id
        WHERE rm.user_id = $1 AND rm.guild_id = $2
        ORDER BY r.position DESC
        "#,
        target_user_id,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<RoleResponse> = roles
        .into_iter()
        .map(|r| RoleResponse {
            id: r.id,
            guild_id: r.guild_id,
            name: r.name,
            color: r.color.unwrap_or_else(|| "#99aab5".to_string()),
            position: r.position,
            permissions: r.permissions,
            mentionable: r.mentionable.unwrap_or(true),
            hoist: r.hoist.unwrap_or(false),
        })
        .collect();

    Ok(Json(response))
}
