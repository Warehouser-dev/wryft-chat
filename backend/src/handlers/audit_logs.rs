use axum::{extract::State, http::StatusCode, Json, http::HeaderMap};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use serde_json::Value as JsonValue;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub guild_id: Uuid,
    pub user_id: Option<Uuid>,
    pub username: Option<String>,
    pub action_type: String,
    pub target_type: Option<String>,
    pub target_id: Option<Uuid>,
    pub details: Option<JsonValue>,
    pub created_at: chrono::NaiveDateTime,
}

// Helper function to create audit log entries
pub async fn create_audit_log(
    db: &sqlx::PgPool,
    guild_id: Uuid,
    user_id: Option<Uuid>,
    action_type: &str,
    target_type: Option<&str>,
    target_id: Option<Uuid>,
    details: Option<JsonValue>,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        "INSERT INTO audit_logs (guild_id, user_id, action_type, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)",
        guild_id,
        user_id,
        action_type,
        target_type,
        target_id,
        details
    )
    .execute(db)
    .await?;

    Ok(())
}

// Get audit logs for a guild
pub async fn get_guild_audit_logs(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(guild_id): axum::extract::Path<Uuid>,
) -> Result<Json<Vec<AuditLog>>, StatusCode> {
    let user_id = extract_user_id(&headers)?;
    
    // Check if user is guild member
    let is_member = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM guild_members WHERE guild_id = $1 AND user_id = $2)",
        guild_id,
        user_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .unwrap_or(false);

    if !is_member {
        return Err(StatusCode::FORBIDDEN);
    }

    let logs = sqlx::query!(
        r#"
        SELECT 
            al.id,
            al.guild_id,
            al.user_id,
            u.username as "username?",
            al.action_type,
            al.target_type,
            al.target_id,
            al.details,
            al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.guild_id = $1
        ORDER BY al.created_at DESC
        LIMIT 100
        "#,
        guild_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response: Vec<AuditLog> = logs
        .into_iter()
        .map(|log| AuditLog {
            id: log.id,
            guild_id: log.guild_id,
            user_id: log.user_id,
            username: log.username,
            action_type: log.action_type,
            target_type: log.target_type,
            target_id: log.target_id,
            details: log.details,
            created_at: log.created_at.unwrap_or_else(|| chrono::Utc::now().naive_utc()),
        })
        .collect();

    Ok(Json(response))
}
