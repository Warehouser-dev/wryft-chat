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

pub async fn get_guild_channels(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<ChannelResponse>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    let channels = sqlx::query!(
        r#"
        SELECT id, guild_id, name, channel_type, position, category_id, created_at
        FROM channels
        WHERE guild_id = $1
        ORDER BY position, created_at
        "#,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<ChannelResponse> = channels
        .into_iter()
        .map(|c| ChannelResponse {
            id: c.id,
            guild_id: c.guild_id,
            name: c.name,
            channel_type: c.channel_type.unwrap_or_else(|| "text".to_string()),
            position: c.position.unwrap_or(0),
            category_id: c.category_id,
        })
        .collect();

    Ok(Json(response))
}

pub async fn create_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
    Json(payload): Json<CreateChannelRequest>,
) -> Result<Json<ChannelResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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

    let channel_id = Uuid::new_v4();
    let channel_type = payload.channel_type.as_deref().unwrap_or("text");

    sqlx::query!(
        "INSERT INTO channels (id, guild_id, name, channel_type, category_id) VALUES ($1, $2, $3, $4, $5)",
        channel_id,
        guild_id,
        payload.name,
        channel_type,
        payload.category_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create audit log entry
    let details = serde_json::json!({
        "channel_name": payload.name,
        "channel_type": channel_type
    });
    
    let _ = crate::handlers::audit_logs::create_audit_log(
        &state.db,
        guild_id,
        Some(user_id),
        "channel_create",
        Some("channel"),
        Some(channel_id),
        Some(details)
    ).await;

    Ok(Json(ChannelResponse {
        id: channel_id,
        guild_id,
        name: payload.name,
        channel_type: channel_type.to_string(),
        position: 0,
        category_id: payload.category_id,
    }))
}

pub async fn delete_channel(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, channel_id)): axum::extract::Path<(Uuid, Uuid)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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

    // Get channel name before deletion for audit log
    let channel = sqlx::query!(
        "SELECT name FROM channels WHERE id = $1 AND guild_id = $2",
        channel_id,
        guild_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    sqlx::query!(
        "DELETE FROM channels WHERE id = $1 AND guild_id = $2",
        channel_id,
        guild_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create audit log entry
    if let Some(channel_record) = channel {
        let details = serde_json::json!({
            "channel_name": channel_record.name
        });
        
        let _ = crate::handlers::audit_logs::create_audit_log(
            &state.db,
            guild_id,
            Some(user_id),
            "channel_delete",
            Some("channel"),
            Some(channel_id),
            Some(details)
        ).await;
    }

    Ok(StatusCode::NO_CONTENT)
}


// Category handlers
pub async fn get_guild_categories(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<CategoryResponse>>, StatusCode> {
    let _user_id = extract_user_id(&headers)?;
    
    let categories = sqlx::query!(
        r#"
        SELECT id, guild_id, name, position, created_at
        FROM channel_categories
        WHERE guild_id = $1
        ORDER BY position, created_at
        "#,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<CategoryResponse> = categories
        .into_iter()
        .map(|c| CategoryResponse {
            id: c.id,
            guild_id: c.guild_id,
            name: c.name,
            position: c.position,
        })
        .collect();

    Ok(Json(response))
}

pub async fn create_category(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
    Json(payload): Json<CreateCategoryRequest>,
) -> Result<Json<CategoryResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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

    let category_id = Uuid::new_v4();

    sqlx::query!(
        "INSERT INTO channel_categories (id, guild_id, name) VALUES ($1, $2, $3)",
        category_id,
        guild_id,
        payload.name
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CategoryResponse {
        id: category_id,
        guild_id,
        name: payload.name,
        position: 0,
    }))
}

pub async fn update_category(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, category_id)): axum::extract::Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateCategoryRequest>,
) -> Result<Json<CategoryResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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

    if let Some(name) = &payload.name {
        sqlx::query!(
            "UPDATE channel_categories SET name = $1 WHERE id = $2 AND guild_id = $3",
            name,
            category_id,
            guild_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(position) = payload.position {
        sqlx::query!(
            "UPDATE channel_categories SET position = $1 WHERE id = $2 AND guild_id = $3",
            position,
            category_id,
            guild_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let category = sqlx::query!(
        "SELECT id, guild_id, name, position FROM channel_categories WHERE id = $1",
        category_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(CategoryResponse {
        id: category.id,
        guild_id: category.guild_id,
        name: category.name,
        position: category.position,
    }))
}

pub async fn delete_category(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, category_id)): axum::extract::Path<(Uuid, Uuid)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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
        "DELETE FROM channel_categories WHERE id = $1 AND guild_id = $2",
        category_id,
        guild_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}


// Channel Permission handlers
pub async fn get_channel_permissions(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, channel_id)): axum::extract::Path<(Uuid, Uuid)>,
) -> Result<Json<Vec<ChannelPermissionResponse>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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

    let permissions = sqlx::query!(
        r#"
        SELECT id, channel_id, role_id, user_id, allow_view, allow_send_messages, allow_manage_messages
        FROM channel_permissions
        WHERE channel_id = $1
        "#,
        channel_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<ChannelPermissionResponse> = permissions
        .into_iter()
        .map(|p| ChannelPermissionResponse {
            id: p.id,
            channel_id: p.channel_id,
            role_id: p.role_id,
            user_id: p.user_id,
            allow_view: p.allow_view.unwrap_or(true),
            allow_send_messages: p.allow_send_messages.unwrap_or(true),
            allow_manage_messages: p.allow_manage_messages.unwrap_or(false),
        })
        .collect();

    Ok(Json(response))
}

pub async fn create_channel_permission(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, channel_id)): axum::extract::Path<(Uuid, Uuid)>,
    Json(payload): Json<CreateChannelPermissionRequest>,
) -> Result<Json<ChannelPermissionResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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

    // Validate that either role_id or user_id is provided, but not both
    if (payload.role_id.is_some() && payload.user_id.is_some()) || 
       (payload.role_id.is_none() && payload.user_id.is_none()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let permission_id = Uuid::new_v4();

    sqlx::query!(
        r#"
        INSERT INTO channel_permissions 
        (id, channel_id, role_id, user_id, allow_view, allow_send_messages, allow_manage_messages)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
        permission_id,
        channel_id,
        payload.role_id,
        payload.user_id,
        payload.allow_view,
        payload.allow_send_messages,
        payload.allow_manage_messages
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ChannelPermissionResponse {
        id: permission_id,
        channel_id,
        role_id: payload.role_id,
        user_id: payload.user_id,
        allow_view: payload.allow_view,
        allow_send_messages: payload.allow_send_messages,
        allow_manage_messages: payload.allow_manage_messages,
    }))
}

pub async fn update_channel_permission(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, channel_id, permission_id)): axum::extract::Path<(Uuid, Uuid, Uuid)>,
    Json(payload): Json<UpdateChannelPermissionRequest>,
) -> Result<Json<ChannelPermissionResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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

    if let Some(allow_view) = payload.allow_view {
        sqlx::query!(
            "UPDATE channel_permissions SET allow_view = $1 WHERE id = $2 AND channel_id = $3",
            allow_view,
            permission_id,
            channel_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(allow_send_messages) = payload.allow_send_messages {
        sqlx::query!(
            "UPDATE channel_permissions SET allow_send_messages = $1 WHERE id = $2 AND channel_id = $3",
            allow_send_messages,
            permission_id,
            channel_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(allow_manage_messages) = payload.allow_manage_messages {
        sqlx::query!(
            "UPDATE channel_permissions SET allow_manage_messages = $1 WHERE id = $2 AND channel_id = $3",
            allow_manage_messages,
            permission_id,
            channel_id
        )
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let permission = sqlx::query!(
        r#"
        SELECT id, channel_id, role_id, user_id, allow_view, allow_send_messages, allow_manage_messages
        FROM channel_permissions
        WHERE id = $1
        "#,
        permission_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(ChannelPermissionResponse {
        id: permission.id,
        channel_id: permission.channel_id,
        role_id: permission.role_id,
        user_id: permission.user_id,
        allow_view: permission.allow_view.unwrap_or(true),
        allow_send_messages: permission.allow_send_messages.unwrap_or(true),
        allow_manage_messages: permission.allow_manage_messages.unwrap_or(false),
    }))
}

pub async fn delete_channel_permission(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path((guild_id, channel_id, permission_id)): axum::extract::Path<(Uuid, Uuid, Uuid)>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild owner
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
        "DELETE FROM channel_permissions WHERE id = $1 AND channel_id = $2",
        permission_id,
        channel_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
