use axum::{extract::State, http::StatusCode, Json};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{models::*, AppState};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

fn generate_discriminator(existing: &[(String, String)], username: &str) -> String {
    let mut discriminator = rand::random::<u16>() % 10000;
    let mut attempts = 0;
    
    while attempts < 100 {
        let disc_str = format!("{:04}", discriminator);
        if !existing.iter().any(|(u, d)| u == username && d == &disc_str) {
            return disc_str;
        }
        discriminator = rand::random::<u16>() % 10000;
        attempts += 1;
    }
    
    format!("{:04}", rand::random::<u16>() % 10000)
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

    // Get existing username/discriminator pairs
    let existing_users = sqlx::query!("SELECT username, discriminator FROM users")
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let existing_pairs: Vec<(String, String)> = existing_users
        .into_iter()
        .map(|r| (r.username, r.discriminator))
        .collect();

    let password_hash = hash(payload.password, DEFAULT_COST)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let discriminator = generate_discriminator(&existing_pairs, &payload.username);
    let user_id = Uuid::new_v4();

    sqlx::query!(
        "INSERT INTO users (id, email, username, discriminator, password_hash) VALUES ($1, $2, $3, $4, $5)",
        user_id,
        payload.email,
        payload.username,
        discriminator,
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
            username: payload.username,
            discriminator,
        },
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let user = sqlx::query!(
        "SELECT id, email, username, discriminator, password_hash FROM users WHERE email = $1",
        payload.email
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    verify(&payload.password, &user.password_hash)
        .map_err(|_| StatusCode::UNAUTHORIZED)?
        .then_some(())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let token = create_token(&user.id)?;
    
    Ok(Json(AuthResponse {
        token,
        user: UserResponse {
            id: user.id,
            email: user.email,
            username: user.username,
            discriminator: user.discriminator,
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

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".to_string());
    
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
