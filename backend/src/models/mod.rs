use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub discriminator: String,
    pub password_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Guild {
    pub id: Uuid,
    pub name: String,
    pub owner_id: Uuid,
    pub icon: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuildMember {
    pub guild_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: Uuid,
    pub filename: String,
    pub file_url: String,
    pub file_type: Option<String>,
    pub file_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: Uuid,
    pub channel: String,
    pub author: String,
    pub author_discriminator: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author_id: Option<String>,
    pub text: String,
    pub timestamp: String,
    #[serde(default)]
    pub edited: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<Attachment>>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub username: String,
    pub discriminator: String,
    pub is_premium: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub premium_since: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub premium_expires_at: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct SendAttachment {
    pub filename: String,
    pub file_url: String,
    pub file_type: Option<String>,
    pub file_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub text: String,
    pub author: String,
    pub author_discriminator: String,
    pub attachments: Option<Vec<SendAttachment>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGuildRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGuildRequest {
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct GuildResponse {
    pub id: Uuid,
    pub name: String,
    pub owner_id: Uuid,
    pub icon: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct MemberResponse {
    pub id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub online: bool,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct ChannelResponse {
    pub id: Uuid,
    pub guild_id: Uuid,
    pub name: String,
    pub channel_type: String,
    pub position: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct CreateChannelRequest {
    pub name: String,
    pub channel_type: Option<String>,
    pub category_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct CategoryResponse {
    pub id: Uuid,
    pub guild_id: Uuid,
    pub name: String,
    pub position: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryRequest {
    pub name: Option<String>,
    pub position: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct InviteResponse {
    pub code: String,
    pub guild_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct InviteInfoResponse {
    pub guild_id: Uuid,
    pub guild_name: String,
    pub guild_icon: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub guild_icon_url: Option<String>,
    pub member_count: i32,
    pub is_member: bool,
}

#[derive(Debug, Serialize)]
pub struct ChannelPermissionResponse {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub role_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub allow_view: bool,
    pub allow_send_messages: bool,
    pub allow_manage_messages: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateChannelPermissionRequest {
    pub role_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub allow_view: bool,
    pub allow_send_messages: bool,
    pub allow_manage_messages: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateChannelPermissionRequest {
    pub allow_view: Option<bool>,
    pub allow_send_messages: Option<bool>,
    pub allow_manage_messages: Option<bool>,
}
