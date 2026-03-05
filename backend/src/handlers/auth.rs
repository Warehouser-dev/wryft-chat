use axum::{extract::State, http::StatusCode, Json};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{models::*, AppState};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    // Check if email exists
    let existing = sqlx::query!("SELECT id FROM users WHERE email = $1", payload.email)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if existing.is_some() {
        return Err(StatusCode::CONFLICT);
    }

    // Validate and get username
    let username = if let Some(provided_username) = payload.username {
        // Validate username format (3-32 chars, alphanumeric + ._-)
        if provided_username.len() < 3 || provided_username.len() > 32 {
            return Err(StatusCode::BAD_REQUEST);
        }
        
        if !provided_username.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '_' || c == '-') {
            return Err(StatusCode::BAD_REQUEST);
        }
        
        provided_username
    } else {
        // Generate temporary username if none provided
        let uuid_str = Uuid::new_v4().to_string();
        format!("user_{}", &uuid_str[..8])
    };
    
    // Check if username is already taken
    let username_exists = sqlx::query!("SELECT id FROM users WHERE username = $1", username)
        .fetch_optional(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if username_exists.is_some() {
        return Err(StatusCode::CONFLICT); // Username taken
    }

    let password_hash = hash(payload.password, DEFAULT_COST)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user_id = Uuid::new_v4();

    sqlx::query!(
        "INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)",
        user_id,
        payload.email,
        username,
        password_hash
    )
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let token = create_token(&user_id)?;
    
    Ok(Json(AuthResponse {
        token,
        user: UserResponse {
            id: user_id,
            email: payload.email,
            username: username.clone(),
            is_premium: false,
            premium_since: None,
            premium_expires_at: None,
            is_admin: Some(false),
            admin_level: Some(0),
        },
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    std::fs::write("/tmp/wryft_login.log", format!("Login attempt: {}\n", payload.email)).ok();
    
    let user = sqlx::query!(
        "SELECT id, email, username, password_hash, is_premium, premium_since, premium_expires_at, is_banned, is_admin, admin_level FROM users WHERE email = $1",
        payload.email
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| {
        eprintln!("Database error during login: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    // Check if user is banned
    if user.is_banned.unwrap_or(false) {
        eprintln!("Banned user attempted login: {}", payload.email);
        return Err(StatusCode::FORBIDDEN);
    }

    verify(&payload.password, &user.password_hash)
        .map_err(|e| {
            eprintln!("Password verification error: {:?}", e);
            StatusCode::UNAUTHORIZED
        })?
        .then_some(())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = create_token(&user.id)?;
    
    Ok(Json(AuthResponse {
        token,
        user: UserResponse {
            id: user.id,
            email: user.email,
            username: user.username,
            is_premium: user.is_premium.unwrap_or(false),
            premium_since: user.premium_since.map(|dt| dt.to_string()),
            premium_expires_at: user.premium_expires_at.map(|dt| dt.to_string()),
            is_admin: user.is_admin,
            admin_level: user.admin_level,
        },
    }))
}

fn create_token(user_id: &Uuid) -> Result<String, StatusCode> {
    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(24))
        .unwrap()
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        exp: expiration,
    };

    // Use the shared JWT secret from environment
    let secret = crate::jwt_secret();
    
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(&secret),
    )
    .map_err(|e| {
        eprintln!("JWT Error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
}
