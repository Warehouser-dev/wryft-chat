use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use crate::AppState;

#[derive(Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    pub about_me: Option<String>,
    pub avatar_url: Option<String>,
    pub theme_config: Option<serde_json::Value>,
    pub banner_color: Option<String>,
    pub banner_color_secondary: Option<String>,
    pub banner_url: Option<String>,
    pub pronouns: Option<String>,
    pub timezone: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct UpdatePrivacySettingsRequest {
    pub allow_dms: Option<String>,
    pub allow_friend_requests: Option<String>,
    pub show_online_status: Option<bool>,
    pub explicit_content_filter: Option<String>,
}

#[derive(Serialize)]
pub struct UserProfile {
    pub id: String,
    pub username: String,
    pub discriminator: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub about_me: Option<String>,
    pub theme_config: Option<serde_json::Value>,
    pub is_premium: bool,
    pub premium_since: Option<String>,
    pub premium_expires_at: Option<String>,
    pub banner_color: Option<String>,
    pub banner_color_secondary: Option<String>,
    pub banner_url: Option<String>,
    pub custom_status: Option<String>,
    pub custom_status_emoji: Option<String>,
    pub pronouns: Option<String>,
    pub timezone: Option<String>,
    pub created_at: String,
    pub allow_dms: Option<String>,
    pub allow_friend_requests: Option<String>,
    pub show_online_status: Option<bool>,
    pub explicit_content_filter: Option<String>,
}

// Get user profile
pub async fn get_user_profile(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<UserProfile>, StatusCode> {
    let user_uuid = uuid::Uuid::parse_str(&user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    let user = sqlx::query!(
        r#"
        SELECT id, username, discriminator, email, avatar_url, about_me, theme_config,
               is_premium, premium_since, premium_expires_at, banner_color, banner_color_secondary, banner_url,
               custom_status, custom_status_emoji, pronouns, timezone, created_at,
               allow_dms, allow_friend_requests, show_online_status, explicit_content_filter
        FROM users
        WHERE id = $1
        "#,
        user_uuid
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(UserProfile {
        id: user.id.to_string(),
        username: user.username,
        discriminator: user.discriminator,
        email: user.email,
        avatar_url: user.avatar_url,
        about_me: user.about_me,
        theme_config: user.theme_config,
        is_premium: user.is_premium.unwrap_or(false),
        premium_since: user.premium_since.map(|dt| dt.to_rfc3339()),
        premium_expires_at: user.premium_expires_at.map(|dt| dt.to_rfc3339()),
        banner_color: user.banner_color,
        banner_color_secondary: user.banner_color_secondary,
        banner_url: user.banner_url,
        custom_status: user.custom_status,
        custom_status_emoji: user.custom_status_emoji,
        pronouns: user.pronouns,
        timezone: user.timezone,
        created_at: user.created_at.map(|dt| dt.to_rfc3339()).unwrap_or_else(|| "Unknown".to_string()),
        allow_dms: user.allow_dms,
        allow_friend_requests: user.allow_friend_requests,
        show_online_status: user.show_online_status,
        explicit_content_filter: user.explicit_content_filter,
    }))
}

// Update user profile (about me and avatar URL)
pub async fn update_user_profile(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<StatusCode, StatusCode> {
    let user_uuid = uuid::Uuid::parse_str(&user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    sqlx::query!(
        r#"
        UPDATE users
        SET about_me = COALESCE($1, about_me),
            avatar_url = COALESCE($2, avatar_url),
            theme_config = COALESCE($3, theme_config),
            banner_color = COALESCE($4, banner_color),
            banner_color_secondary = COALESCE($5, banner_color_secondary),
            banner_url = COALESCE($6, banner_url),
            pronouns = COALESCE($7, pronouns),
            timezone = COALESCE($8, timezone)
        WHERE id = $9
        "#,
        payload.about_me,
        payload.avatar_url,
        payload.theme_config,
        payload.banner_color,
        payload.banner_color_secondary,
        payload.banner_url,
        payload.pronouns,
        payload.timezone,
        user_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|err| {
        eprintln!("Error updating user profile: {:?}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::OK)
}

#[derive(Serialize)]
pub struct MutualGuild {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub icon_url: Option<String>,
}

#[derive(Serialize)]
pub struct MutualFriend {
    pub id: String,
    pub username: String,
    pub discriminator: String,
    pub avatar_url: Option<String>,
}

// Get mutual guilds between current user and target user
pub async fn get_mutual_guilds(
    State(state): State<AppState>,
    Path((current_user_id, target_user_id)): Path<(String, String)>,
) -> Result<Json<Vec<MutualGuild>>, StatusCode> {
    let current_uuid = uuid::Uuid::parse_str(&current_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let target_uuid = uuid::Uuid::parse_str(&target_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    let guilds = sqlx::query!(
        r#"
        SELECT DISTINCT g.id, g.name, g.icon, g.icon_url
        FROM guilds g
        INNER JOIN guild_members gm1 ON g.id = gm1.guild_id
        INNER JOIN guild_members gm2 ON g.id = gm2.guild_id
        WHERE gm1.user_id = $1 AND gm2.user_id = $2
        ORDER BY g.name
        "#,
        current_uuid,
        target_uuid
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mutual_guilds = guilds.into_iter().map(|g| MutualGuild {
        id: g.id.to_string(),
        name: g.name,
        icon: g.icon,
        icon_url: g.icon_url,
    }).collect();

    Ok(Json(mutual_guilds))
}

// Get mutual friends between current user and target user
pub async fn get_mutual_friends(
    State(state): State<AppState>,
    Path((current_user_id, target_user_id)): Path<(String, String)>,
) -> Result<Json<Vec<MutualFriend>>, StatusCode> {
    let current_uuid = uuid::Uuid::parse_str(&current_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    let target_uuid = uuid::Uuid::parse_str(&target_user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    let friends = sqlx::query!(
        r#"
        SELECT DISTINCT u.id, u.username, u.discriminator, u.avatar_url
        FROM users u
        WHERE u.id IN (
            -- Get current user's friends
            SELECT CASE 
                WHEN f.user_id = $1 THEN f.friend_id
                ELSE f.user_id
            END as friend_id
            FROM friendships f
            WHERE (f.user_id = $1 OR f.friend_id = $1) 
            AND f.status = 'accepted'
        )
        AND u.id IN (
            -- Get target user's friends
            SELECT CASE 
                WHEN f.user_id = $2 THEN f.friend_id
                ELSE f.user_id
            END as friend_id
            FROM friendships f
            WHERE (f.user_id = $2 OR f.friend_id = $2) 
            AND f.status = 'accepted'
        )
        ORDER BY u.username
        "#,
        current_uuid,
        target_uuid
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mutual_friends = friends.into_iter().map(|f| MutualFriend {
        id: f.id.to_string(),
        username: f.username,
        discriminator: f.discriminator,
        avatar_url: f.avatar_url,
    }).collect();

    Ok(Json(mutual_friends))
}

#[derive(Deserialize)]
pub struct UpdateCustomStatusRequest {
    pub custom_status: Option<String>,
    pub custom_status_emoji: Option<String>,
}

// Update custom status
pub async fn update_custom_status(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Json(payload): Json<UpdateCustomStatusRequest>,
) -> Result<StatusCode, StatusCode> {
    let user_uuid = uuid::Uuid::parse_str(&user_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    sqlx::query!(
        "UPDATE users SET custom_status = $1, custom_status_emoji = $2 WHERE id = $3",
        payload.custom_status,
        payload.custom_status_emoji,
        user_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}

// Update privacy settings
pub async fn update_privacy_settings(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
    Json(payload): Json<UpdatePrivacySettingsRequest>,
) -> Result<StatusCode, StatusCode> {
    let user_uuid = uuid::Uuid::parse_str(&user_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    sqlx::query!(
        r#"
        UPDATE users
        SET allow_dms = COALESCE($1, allow_dms),
            allow_friend_requests = COALESCE($2, allow_friend_requests),
            show_online_status = COALESCE($3, show_online_status),
            explicit_content_filter = COALESCE($4, explicit_content_filter)
        WHERE id = $5
        "#,
        payload.allow_dms,
        payload.allow_friend_requests,
        payload.show_online_status,
        payload.explicit_content_filter,
        user_uuid
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
