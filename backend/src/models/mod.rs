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
pub struct Message {
    pub id: Uuid,
    pub channel: String,
    pub author: String,
    pub author_discriminator: String,
    pub text: String,
    pub timestamp: String,
    #[serde(default)]
    pub edited: bool,
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
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub text: String,
    pub author: String,
    pub author_discriminator: String,
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
}

#[derive(Debug, Serialize)]
pub struct MemberResponse {
    pub id: Uuid,
    pub username: String,
    pub discriminator: String,
    pub online: bool,
}

#[derive(Debug, Serialize)]
pub struct ChannelResponse {
    pub id: Uuid,
    pub guild_id: Uuid,
    pub name: String,
    pub channel_type: String,
    pub position: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateChannelRequest {
    pub name: String,
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
    pub member_count: i32,
    pub is_member: bool,
}
