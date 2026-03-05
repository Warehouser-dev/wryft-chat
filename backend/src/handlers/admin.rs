use axum::{
    extract::{Path, Query, State, Extension},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use crate::AppState;

// Admin middleware check
pub async fn require_admin(user_id: &str, state: &AppState) -> Result<i32, StatusCode> {
    let user_uuid = Uuid::parse_str(user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    let user = sqlx::query!(
        "SELECT admin_level, is_admin FROM users WHERE id = $1",
        user_uuid
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;
    
    if !user.is_admin.unwrap_or(false) || user.admin_level.unwrap_or(0) < 1 {
        return Err(StatusCode::FORBIDDEN);
    }
    
    Ok(user.admin_level.unwrap_or(0))
}

#[derive(Serialize, FromRow)]
pub struct DashboardStats {
    total_users: Option<i64>,
    new_users_week: Option<i64>,
    total_guilds: Option<i64>,
    new_guilds_week: Option<i64>,
    total_messages: Option<i64>,
    messages_today: Option<i64>,
    total_banned: Option<i64>,
    users_online: Option<i64>,
}

#[derive(Serialize)]
pub struct UserListItem {
    id: String,
    username: String,
    email: String,
    created_at: String,
    is_premium: bool,
    is_banned: bool,
    admin_level: i32,
}

#[derive(Serialize)]
pub struct GuildListItem {
    id: String,
    name: String,
    owner_id: String,
    member_count: i64,
    created_at: String,
}

#[derive(Deserialize)]
pub struct BanUserRequest {
    reason: String,
    duration_days: Option<i32>, // None = permanent
}

#[derive(Deserialize)]
pub struct AdminActionRequest {
    reason: String,
}

// Get dashboard stats
pub async fn get_dashboard_stats(
    State(state): State<AppState>,
    Extension(user_id): Extension<String>,
) -> Result<Json<DashboardStats>, StatusCode> {
    require_admin(&user_id, &state).await?;
    
    let stats = sqlx::query_as::<_, DashboardStats>(
        r#"
        SELECT
            total_users,
            new_users_week,
            total_guilds,
            new_guilds_week,
            total_messages,
            messages_today,
            total_banned,
            users_online
        FROM admin_dashboard_stats
        "#
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        eprintln!("Failed to fetch dashboard stats: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    
    Ok(Json(stats))
}

// Get all users with pagination
#[derive(Deserialize)]
pub struct PaginationQuery {
    page: Option<i64>,
    limit: Option<i64>,
}

pub async fn get_users(
    State(state): State<AppState>,
    Query(params): Query<PaginationQuery>,
    Extension(user_id): Extension<String>,
) -> Result<Json<Vec<UserListItem>>, StatusCode> {
    require_admin(&user_id, &state).await?;
    
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = (page - 1) * limit;
    
    let users = sqlx::query!(
        r#"
        SELECT id, username, email, created_at, is_premium, is_banned, admin_level
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let user_list: Vec<UserListItem> = users
        .into_iter()
        .map(|u| UserListItem {
            id: u.id.to_string(),
            username: u.username,
            email: u.email,
            created_at: u.created_at.unwrap().to_string(),
            is_premium: u.is_premium.unwrap_or(false),
            is_banned: u.is_banned.unwrap_or(false),
            admin_level: u.admin_level.unwrap_or(0),
        })
        .collect();
    
    Ok(Json(user_list))
}

// Ban a user
pub async fn ban_user(
    State(state): State<AppState>,
    Path(target_user_id): Path<String>,
    Extension(admin_id): Extension<String>,
    Json(payload): Json<BanUserRequest>,
) -> Result<StatusCode, StatusCode> {
    let admin_level = require_admin(&admin_id, &state).await?;
    
    if admin_level < 2 {
        return Err(StatusCode::FORBIDDEN); // Need admin level 2+ to ban
    }
    
    let target_uuid = Uuid::parse_str(&target_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let admin_uuid = Uuid::parse_str(&admin_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    // Calculate expiration
    let expires_at = payload.duration_days.map(|days| {
        (chrono::Utc::now() + chrono::Duration::days(days as i64)).naive_utc()
    });
    
    // Insert ban record
    sqlx::query!(
        r#"
        INSERT INTO banned_users (user_id, banned_by, reason, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET
            banned_by = $2,
            reason = $3,
            banned_at = CURRENT_TIMESTAMP,
            expires_at = $4
        "#,
        target_uuid,
        admin_uuid,
        payload.reason,
        expires_at
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Update user is_banned flag
    sqlx::query!(
        "UPDATE users SET is_banned = TRUE WHERE id = $1",
        target_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log admin action
    sqlx::query!(
        r#"
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason)
        VALUES ($1, 'ban_user', 'user', $2, $3)
        "#,
        admin_uuid,
        target_uuid,
        payload.reason
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(StatusCode::OK)
}

// Unban a user
pub async fn unban_user(
    State(state): State<AppState>,
    Path(target_user_id): Path<String>,
    Extension(admin_id): Extension<String>,
) -> Result<StatusCode, StatusCode> {
    let admin_level = require_admin(&admin_id, &state).await?;
    
    if admin_level < 2 {
        return Err(StatusCode::FORBIDDEN);
    }
    
    let target_uuid = Uuid::parse_str(&target_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let admin_uuid = Uuid::parse_str(&admin_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    // Delete ban record
    sqlx::query!(
        "DELETE FROM banned_users WHERE user_id = $1",
        target_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Update user is_banned flag
    sqlx::query!(
        "UPDATE users SET is_banned = FALSE WHERE id = $1",
        target_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Log admin action
    sqlx::query!(
        r#"
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason)
        VALUES ($1, 'unban_user', 'user', $2, 'User unbanned')
        "#,
        admin_uuid,
        target_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(StatusCode::OK)
}

// Delete a user
pub async fn delete_user(
    State(state): State<AppState>,
    Path(target_user_id): Path<String>,
    Extension(admin_id): Extension<String>,
    Json(payload): Json<AdminActionRequest>,
) -> Result<StatusCode, StatusCode> {
    let admin_level = require_admin(&admin_id, &state).await?;
    
    if admin_level < 3 {
        return Err(StatusCode::FORBIDDEN); // Need super admin to delete users
    }
    
    let target_uuid = Uuid::parse_str(&target_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let admin_uuid = Uuid::parse_str(&admin_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    // Log admin action before deletion
    sqlx::query!(
        r#"
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason)
        VALUES ($1, 'delete_user', 'user', $2, $3)
        "#,
        admin_uuid,
        target_uuid,
        payload.reason
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Delete user (CASCADE will handle related records)
    sqlx::query!(
        "DELETE FROM users WHERE id = $1",
        target_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(StatusCode::OK)
}

// Get all guilds
pub async fn get_guilds(
    State(state): State<AppState>,
    Query(params): Query<PaginationQuery>,
    Extension(user_id): Extension<String>,
) -> Result<Json<Vec<GuildListItem>>, StatusCode> {
    require_admin(&user_id, &state).await?;
    
    let page = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(50).min(100);
    let offset = (page - 1) * limit;
    
    let guilds = sqlx::query!(
        r#"
        SELECT 
            g.id, 
            g.name, 
            g.owner_id, 
            g.created_at,
            COUNT(gm.user_id) as member_count
        FROM guilds g
        LEFT JOIN guild_members gm ON g.id = gm.guild_id
        GROUP BY g.id
        ORDER BY g.created_at DESC
        LIMIT $1 OFFSET $2
        "#,
        limit,
        offset
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let guild_list: Vec<GuildListItem> = guilds
        .into_iter()
        .map(|g| GuildListItem {
            id: g.id.to_string(),
            name: g.name,
            owner_id: g.owner_id.to_string(),
            member_count: g.member_count.unwrap_or(0),
            created_at: g.created_at.unwrap().to_string(),
        })
        .collect();
    
    Ok(Json(guild_list))
}

// Delete a guild
pub async fn delete_guild(
    State(state): State<AppState>,
    Path(guild_id): Path<String>,
    Extension(admin_id): Extension<String>,
    Json(payload): Json<AdminActionRequest>,
) -> Result<StatusCode, StatusCode> {
    let admin_level = require_admin(&admin_id, &state).await?;
    
    if admin_level < 2 {
        return Err(StatusCode::FORBIDDEN);
    }
    
    let guild_uuid = Uuid::parse_str(&guild_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let admin_uuid = Uuid::parse_str(&admin_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    // Log admin action
    sqlx::query!(
        r#"
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, reason)
        VALUES ($1, 'delete_guild', 'guild', $2, $3)
        "#,
        admin_uuid,
        guild_uuid,
        payload.reason
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Delete guild
    sqlx::query!(
        "DELETE FROM guilds WHERE id = $1",
        guild_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(StatusCode::OK)
}
