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
pub struct FriendResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub avatar_url: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct SendFriendRequestBody {
    pub username: String,
    pub discriminator: String,
}

// Send a friend request
pub async fn send_friend_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SendFriendRequestBody>,
) -> Result<Json<FriendResponse>, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    // Find the target user
    let target_user = sqlx::query!(
        "SELECT id FROM users WHERE username = $1 AND discriminator = $2",
        payload.username,
        payload.discriminator
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let friend_id = target_user.id;

    // Can't friend yourself
    if user_id == friend_id {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Check if friendship already exists (in either direction)
    let existing = sqlx::query!(
        r#"
        SELECT id, user_id, friend_id, status
        FROM friendships
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
        "#,
        user_id,
        friend_id
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(friendship) = existing {
        // If already friends or pending, return conflict
        if friendship.status == "accepted" || friendship.status == "pending" {
            return Err(StatusCode::CONFLICT);
        }
        // If blocked, don't allow
        if friendship.status == "blocked" {
            return Err(StatusCode::FORBIDDEN);
        }
    }

    // Create friend request
    let friendship_id = Uuid::new_v4();
    let created_at = sqlx::query!(
        r#"
        INSERT INTO friendships (id, user_id, friend_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING created_at
        "#,
        friendship_id,
        user_id,
        friend_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Get friend info
    let friend_info = sqlx::query!(
        "SELECT username, discriminator, avatar_url FROM users WHERE id = $1",
        friend_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(FriendResponse {
        id: friendship_id,
        user_id: friend_id,
        username: friend_info.username,
        discriminator: friend_info.discriminator,
        avatar_url: friend_info.avatar_url,
        status: "pending".to_string(),
        created_at: created_at.created_at.unwrap().to_rfc3339(),
    }))
}

// Accept a friend request
pub async fn accept_friend_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(friendship_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    // Update the friendship status (only if the current user is the friend_id)
    let result = sqlx::query!(
        r#"
        UPDATE friendships
        SET status = 'accepted', updated_at = NOW()
        WHERE id = $1 AND friend_id = $2 AND status = 'pending'
        "#,
        friendship_id,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::OK)
}

// Decline a friend request
pub async fn decline_friend_request(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(friendship_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    // Delete the friendship (only if the current user is the friend_id)
    let result = sqlx::query!(
        r#"
        DELETE FROM friendships
        WHERE id = $1 AND friend_id = $2 AND status = 'pending'
        "#,
        friendship_id,
        user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::NO_CONTENT)
}

// Remove a friend (or cancel a pending request)
pub async fn remove_friend(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(friend_user_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    // Delete friendship in either direction
    let result = sqlx::query!(
        r#"
        DELETE FROM friendships
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
        "#,
        user_id,
        friend_user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::NO_CONTENT)
}

// Get all friends (accepted)
pub async fn get_friends(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<FriendResponse>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    let friends = sqlx::query!(
        r#"
        SELECT 
            f.id,
            CASE 
                WHEN f.user_id = $1 THEN f.friend_id
                ELSE f.user_id
            END as friend_user_id,
            u.username,
            u.discriminator,
            u.avatar_url,
            f.status,
            f.created_at
        FROM friendships f
        INNER JOIN users u ON u.id = CASE 
            WHEN f.user_id = $1 THEN f.friend_id
            ELSE f.user_id
        END
        WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
        ORDER BY u.username
        "#,
        user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<FriendResponse> = friends
        .into_iter()
        .map(|f| FriendResponse {
            id: f.id,
            user_id: f.friend_user_id.unwrap(),
            username: f.username,
            discriminator: f.discriminator,
            avatar_url: f.avatar_url,
            status: f.status,
            created_at: f.created_at.unwrap().to_rfc3339(),
        })
        .collect();

    Ok(Json(response))
}

// Get pending friend requests (incoming)
pub async fn get_pending_requests(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<FriendResponse>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    let requests = sqlx::query!(
        r#"
        SELECT 
            f.id,
            f.user_id,
            u.username,
            u.discriminator,
            u.avatar_url,
            f.status,
            f.created_at
        FROM friendships f
        INNER JOIN users u ON u.id = f.user_id
        WHERE f.friend_id = $1 AND f.status = 'pending'
        ORDER BY f.created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<FriendResponse> = requests
        .into_iter()
        .map(|f| FriendResponse {
            id: f.id,
            user_id: f.user_id,
            username: f.username,
            discriminator: f.discriminator,
            avatar_url: f.avatar_url,
            status: f.status,
            created_at: f.created_at.unwrap().to_rfc3339(),
        })
        .collect();

    Ok(Json(response))
}

// Get outgoing friend requests (sent by current user)
pub async fn get_outgoing_requests(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<FriendResponse>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    let requests = sqlx::query!(
        r#"
        SELECT 
            f.id,
            f.friend_id,
            u.username,
            u.discriminator,
            u.avatar_url,
            f.status,
            f.created_at
        FROM friendships f
        INNER JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = $1 AND f.status = 'pending'
        ORDER BY f.created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<FriendResponse> = requests
        .into_iter()
        .map(|f| FriendResponse {
            id: f.id,
            user_id: f.friend_id,
            username: f.username,
            discriminator: f.discriminator,
            avatar_url: f.avatar_url,
            status: f.status,
            created_at: f.created_at.unwrap().to_rfc3339(),
        })
        .collect();

    Ok(Json(response))
}

// Block a user
pub async fn block_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(blocked_user_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    if user_id == blocked_user_id {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Delete any existing friendship
    sqlx::query!(
        r#"
        DELETE FROM friendships
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
        "#,
        user_id,
        blocked_user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Create block entry
    sqlx::query!(
        r#"
        INSERT INTO friendships (id, user_id, friend_id, status)
        VALUES ($1, $2, $3, 'blocked')
        ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'blocked', updated_at = NOW()
        "#,
        Uuid::new_v4(),
        user_id,
        blocked_user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}

// Unblock a user
pub async fn unblock_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(blocked_user_id): axum::extract::Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    let result = sqlx::query!(
        r#"
        DELETE FROM friendships
        WHERE user_id = $1 AND friend_id = $2 AND status = 'blocked'
        "#,
        user_id,
        blocked_user_id
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::NO_CONTENT)
}

// Get blocked users
pub async fn get_blocked_users(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<FriendResponse>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;

    let blocked = sqlx::query!(
        r#"
        SELECT 
            f.id,
            f.friend_id,
            u.username,
            u.discriminator,
            u.avatar_url,
            f.status,
            f.created_at
        FROM friendships f
        INNER JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = $1 AND f.status = 'blocked'
        ORDER BY f.created_at DESC
        "#,
        user_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<FriendResponse> = blocked
        .into_iter()
        .map(|f| FriendResponse {
            id: f.id,
            user_id: f.friend_id,
            username: f.username,
            discriminator: f.discriminator,
            avatar_url: f.avatar_url,
            status: f.status,
            created_at: f.created_at.unwrap().to_rfc3339(),
        })
        .collect();

    Ok(Json(response))
}
