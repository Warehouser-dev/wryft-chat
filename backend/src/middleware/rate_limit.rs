use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use crate::AppState;
use std::time::{SystemTime, UNIX_EPOCH};

const UPLOAD_LIMIT: i32 = 10; // uploads per window
const WINDOW_SECONDS: i64 = 60; // 1 minute window

pub async fn upload_rate_limit(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Get user_id from request extensions (set by auth middleware)
    let user_id = request
        .extensions()
        .get::<String>()
        .ok_or(StatusCode::UNAUTHORIZED)?
        .clone();

    let user_uuid = uuid::Uuid::parse_str(&user_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Get current timestamp as f64
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs_f64();

    // Check rate limit - simplified query
    let result = sqlx::query!(
        r#"
        WITH current_window AS (
            SELECT 
                user_id,
                upload_count,
                window_start,
                CASE 
                    WHEN (to_timestamp($2) - window_start) > interval '60 seconds'
                    THEN 1
                    ELSE upload_count + 1
                END as new_count,
                CASE 
                    WHEN (to_timestamp($2) - window_start) > interval '60 seconds'
                    THEN to_timestamp($2)
                    ELSE window_start
                END as new_window_start
            FROM upload_rate_limits
            WHERE user_id = $1
        )
        INSERT INTO upload_rate_limits (user_id, upload_count, window_start)
        VALUES ($1, 1, to_timestamp($2))
        ON CONFLICT (user_id) DO UPDATE SET
            upload_count = COALESCE((SELECT new_count FROM current_window), 1),
            window_start = COALESCE((SELECT new_window_start FROM current_window), to_timestamp($2))
        RETURNING upload_count
        "#,
        user_uuid,
        now
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let count = result.upload_count.unwrap_or(1);
    
    if count > UPLOAD_LIMIT {
        eprintln!("⚠️  Rate limit exceeded for user {}: {} uploads", user_id, count);
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    println!("✅ Rate limit check passed: {}/{} uploads", count, UPLOAD_LIMIT);
    Ok(next.run(request).await)
}
