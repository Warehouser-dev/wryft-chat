use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    Extension,
    Json,
};
use serde::Serialize;
use crate::AppState;

#[derive(Serialize)]
pub struct UploadResponse {
    pub url: String,
    pub file_id: String,
}

// Helper to track file upload in database
async fn track_upload(
    state: &AppState,
    user_id: &str,
    file_type: &str,
    file_key: &str,
    file_url: &str,
    file_size: usize,
    content_type: &str,
) -> Result<String, StatusCode> {
    let user_uuid = uuid::Uuid::parse_str(user_id).map_err(|_| StatusCode::BAD_REQUEST)?;
    
    let result = sqlx::query!(
        r#"
        INSERT INTO file_uploads (user_id, file_type, file_key, file_url, file_size, content_type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        "#,
        user_uuid,
        file_type,
        file_key,
        file_url,
        file_size as i32,
        content_type
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        eprintln!("Failed to track upload: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(result.id.to_string())
}

// Upload avatar
pub async fn upload_avatar(
    State(state): State<AppState>,
    Extension(user_id): Extension<String>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
    
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        eprintln!("Error reading multipart field: {:?}", e);
        StatusCode::BAD_REQUEST
    })? {
        if field.name() == Some("file") {
            let filename = field.file_name().unwrap_or("avatar.png").to_string();
            let data = field.bytes().await.map_err(|e| {
                eprintln!("Error reading file bytes: {:?}", e);
                StatusCode::BAD_REQUEST
            })?;
            
            // Validate file size (max 5MB)
            if data.len() > 5 * 1024 * 1024 {
                eprintln!("File too large: {} bytes", data.len());
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }

            let content_type = get_content_type(&filename);
            let key = format!("avatars/{}-{}", uuid::Uuid::new_v4(), filename);
            
            println!("📤 Uploading avatar: {} ({})", key, content_type);
            
            let key = state.storage
                .upload_file(&key, data.clone(), &content_type)
                .await
                .map_err(|e| {
                    eprintln!("❌ S3 upload failed: {:?}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?;

            // Track upload in database and get file_id
            let file_id = track_upload(&state, &user_id, "avatar", &key, "", data.len(), &content_type).await?;

            // Return file_id instead of direct URL
            let url = format!("/api/files/{}", file_id);
            
            println!("✅ Avatar uploaded successfully: {}", url);
            return Ok(Json(UploadResponse { url, file_id }));
        }
    }

    eprintln!("No file field found in multipart request");
    Err(StatusCode::BAD_REQUEST)
}

// Upload banner
pub async fn upload_banner(
    State(state): State<AppState>,
    Extension(user_id): Extension<String>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
    
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        if field.name() == Some("file") {
            let filename = field.file_name().unwrap_or("banner.png").to_string();
            let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
            
            if data.len() > 10 * 1024 * 1024 {
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }

            let content_type = get_content_type(&filename);
            let key = format!("banners/{}-{}", uuid::Uuid::new_v4(), filename);
            
            let key = state.storage
                .upload_file(&key, data.clone(), &content_type)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            let file_id = track_upload(&state, &user_id, "banner", &key, "", data.len(), &content_type).await?;
            let url = format!("/api/files/{}", file_id);
            return Ok(Json(UploadResponse { url, file_id }));
        }
    }

    Err(StatusCode::BAD_REQUEST)
}

// Upload icon
pub async fn upload_icon(
    State(state): State<AppState>,
    Extension(user_id): Extension<String>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
    
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        if field.name() == Some("file") {
            let filename = field.file_name().unwrap_or("icon.png").to_string();
            let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
            
            if data.len() > 5 * 1024 * 1024 {
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }

            let content_type = get_content_type(&filename);
            let key = format!("icons/{}-{}", uuid::Uuid::new_v4(), filename);
            
            let key = state.storage
                .upload_file(&key, data.clone(), &content_type)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            let file_id = track_upload(&state, &user_id, "icon", &key, "", data.len(), &content_type).await?;
            let url = format!("/api/files/{}", file_id);
            return Ok(Json(UploadResponse { url, file_id }));
        }
    }

    Err(StatusCode::BAD_REQUEST)
}

// Upload emoji
pub async fn upload_emoji(
    State(state): State<AppState>,
    Extension(user_id): Extension<String>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
    
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        if field.name() == Some("file") {
            let filename = field.file_name().unwrap_or("emoji.png").to_string();
            let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
            
            if data.len() > 256 * 1024 {
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }

            let content_type = get_content_type(&filename);
            let key = format!("emoji/{}-{}", uuid::Uuid::new_v4(), filename);
            
            let key = state.storage
                .upload_file(&key, data.clone(), &content_type)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            let file_id = track_upload(&state, &user_id, "emoji", &key, "", data.len(), &content_type).await?;
            let url = format!("/api/files/{}", file_id);
            return Ok(Json(UploadResponse { url, file_id }));
        }
    }

    Err(StatusCode::BAD_REQUEST)
}

// Upload attachment
pub async fn upload_attachment(
    State(state): State<AppState>,
    Extension(user_id): Extension<String>,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, StatusCode> {
    
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        if field.name() == Some("file") {
            let filename = field.file_name().unwrap_or("file").to_string();
            let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
            
            if data.len() > 25 * 1024 * 1024 {
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }

            let content_type = get_content_type(&filename);
            let key = format!("attachments/{}-{}", uuid::Uuid::new_v4(), sanitize_filename(&filename));
            
            let key = state.storage
                .upload_file(&key, data.clone(), &content_type)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            let file_id = track_upload(&state, &user_id, "attachment", &key, "", data.len(), &content_type).await?;
            let url = format!("/api/files/{}", file_id);
            return Ok(Json(UploadResponse { url, file_id }));
        }
    }

    Err(StatusCode::BAD_REQUEST)
}

fn get_content_type(filename: &str) -> String {
    let ext = filename.split('.').last().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "pdf" => "application/pdf",
        "txt" => "text/plain",
        _ => "application/octet-stream",
    }.to_string()
}

fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect()
}
