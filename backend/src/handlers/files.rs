use axum::{
    body::Body,
    extract::{Path, State, Request},
    http::{StatusCode, header},
    response::{Response, IntoResponse},
};
use crate::AppState;

// Serve file with permission check
pub async fn serve_file(
    State(state): State<AppState>,
    Path(file_id): Path<String>,
    request: Request,
) -> Result<Response, StatusCode> {
    // Get user_id from request (optional - some files might be public)
    let user_id = request.extensions().get::<String>().cloned();
    
    let file_uuid = uuid::Uuid::parse_str(&file_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Get file info from database
    let file = sqlx::query!(
        r#"
        SELECT file_key, content_type, file_type, user_id
        FROM file_uploads
        WHERE id = $1
        "#,
        file_uuid
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    // Check permissions based on file type
    let has_permission = check_file_permission(&state, &file.file_type, &file.user_id.to_string(), user_id.as_deref()).await?;
    
    if !has_permission {
        eprintln!("🚫 Access denied to file {} for user {:?}", file_id, user_id);
        return Err(StatusCode::FORBIDDEN);
    }

    // Update last accessed time
    let _ = sqlx::query!(
        "UPDATE file_uploads SET accessed_at = CURRENT_TIMESTAMP WHERE id = $1",
        file_uuid
    )
    .execute(&state.db)
    .await;

    // Get file from S3
    let file_data = state.storage
        .get_file(&file.file_key)
        .await
        .map_err(|e| {
            eprintln!("Failed to get file from S3: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    println!("✅ Serving file {} to user {:?}", file_id, user_id);

    // Return file with appropriate headers
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, file.content_type)
        .header(header::CACHE_CONTROL, "public, max-age=31536000") // Cache for 1 year
        .body(Body::from(file_data))
        .unwrap())
}

// Check if user has permission to access file
async fn check_file_permission(
    state: &AppState,
    file_type: &str,
    owner_id: &str,
    user_id: Option<&str>,
) -> Result<bool, StatusCode> {
    match file_type {
        // Public files - anyone can access
        "avatar" | "icon" | "emoji" => Ok(true),
        
        // Banners - public for now (could be restricted to friends/guild members)
        "banner" => Ok(true),
        
        // Attachments - only owner and message recipients can access
        "attachment" => {
            if let Some(uid) = user_id {
                // Owner can always access
                if uid == owner_id {
                    return Ok(true);
                }
                
                // TODO: Check if user is in the same DM/channel as the message
                // For now, allow if authenticated
                Ok(true)
            } else {
                Ok(false)
            }
        }
        
        _ => Ok(false),
    }
}
