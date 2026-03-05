use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;

#[derive(Serialize, Deserialize)]
pub struct Badge {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub category: String,
    pub rarity: String,
    pub is_secret: bool,
}

#[derive(Serialize, Deserialize)]
pub struct UserBadge {
    pub id: String,
    pub badge: Badge,
    pub earned_at: String,
    pub progress: i32,
}

#[derive(Serialize, Deserialize)]
pub struct UserStats {
    pub messages_sent: i32,
    pub dms_sent: i32,
    pub friends_added: i32,
    pub servers_joined: i32,
    pub servers_created: i32,
    pub reactions_given: i32,
    pub reactions_received: i32,
    pub voice_minutes: i32,
    pub files_uploaded: i32,
    pub days_active: i32,
}

#[derive(Serialize)]
pub struct BadgeProgress {
    pub badge: Badge,
    pub current: i32,
    pub required: i32,
    pub percentage: f32,
}

// Get all badges for a user
pub async fn get_user_badges(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<UserBadge>>, StatusCode> {
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let badges = sqlx::query!(
        r#"
        SELECT 
            ub.id as user_badge_id,
            ub.earned_at,
            ub.progress,
            b.id as badge_id,
            b.name,
            b.description,
            b.icon,
            b.category,
            b.rarity,
            b.is_secret
        FROM user_badges ub
        JOIN badges b ON ub.badge_id = b.id
        WHERE ub.user_id = $1
        ORDER BY ub.earned_at DESC
        "#,
        user_uuid
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user_badges = badges
        .into_iter()
        .map(|row| UserBadge {
            id: row.user_badge_id.to_string(),
            badge: Badge {
                id: row.badge_id.to_string(),
                name: row.name,
                description: row.description,
                icon: row.icon,
                category: row.category,
                rarity: row.rarity,
                is_secret: row.is_secret.unwrap_or(false),
            },
            earned_at: row.earned_at.unwrap_or_else(|| chrono::Utc::now()).to_rfc3339(),
            progress: row.progress.unwrap_or(0),
        })
        .collect();

    Ok(Json(user_badges))
}

// Get all available badges
pub async fn get_all_badges(
    State(state): State<AppState>,
) -> Result<Json<Vec<Badge>>, StatusCode> {
    let badges = sqlx::query!(
        r#"
        SELECT id, name, description, icon, category, rarity, is_secret
        FROM badges
        WHERE is_secret = FALSE
        ORDER BY 
            CASE rarity
                WHEN 'common' THEN 1
                WHEN 'uncommon' THEN 2
                WHEN 'rare' THEN 3
                WHEN 'epic' THEN 4
                WHEN 'legendary' THEN 5
            END,
            name
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let all_badges = badges
        .into_iter()
        .map(|row| Badge {
            id: row.id.to_string(),
            name: row.name,
            description: row.description,
            icon: row.icon,
            category: row.category,
            rarity: row.rarity,
            is_secret: row.is_secret.unwrap_or(false),
        })
        .collect();

    Ok(Json(all_badges))
}

// Get user stats
pub async fn get_user_stats(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<UserStats>, StatusCode> {
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    let stats = sqlx::query!(
        r#"
        SELECT 
            messages_sent,
            dms_sent,
            friends_added,
            servers_joined,
            servers_created,
            reactions_given,
            reactions_received,
            voice_minutes,
            files_uploaded,
            days_active
        FROM user_stats
        WHERE user_id = $1
        "#,
        user_uuid
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(stats) = stats {
        Ok(Json(UserStats {
            messages_sent: stats.messages_sent.unwrap_or(0),
            dms_sent: stats.dms_sent.unwrap_or(0),
            friends_added: stats.friends_added.unwrap_or(0),
            servers_joined: stats.servers_joined.unwrap_or(0),
            servers_created: stats.servers_created.unwrap_or(0),
            reactions_given: stats.reactions_given.unwrap_or(0),
            reactions_received: stats.reactions_received.unwrap_or(0),
            voice_minutes: stats.voice_minutes.unwrap_or(0),
            files_uploaded: stats.files_uploaded.unwrap_or(0),
            days_active: stats.days_active.unwrap_or(0),
        }))
    } else {
        // Create stats entry if it doesn't exist
        sqlx::query!(
            "INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
            user_uuid
        )
        .execute(&state.db)
        .await
        .ok();

        Ok(Json(UserStats {
            messages_sent: 0,
            dms_sent: 0,
            friends_added: 0,
            servers_joined: 0,
            servers_created: 0,
            reactions_given: 0,
            reactions_received: 0,
            voice_minutes: 0,
            files_uploaded: 0,
            days_active: 0,
        }))
    }
}

// Get badge progress for a user
pub async fn get_badge_progress(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<Vec<BadgeProgress>>, StatusCode> {
    let user_uuid = Uuid::parse_str(&user_id).map_err(|_| StatusCode::BAD_REQUEST)?;

    // Get user stats
    let stats = sqlx::query!(
        "SELECT * FROM user_stats WHERE user_id = $1",
        user_uuid
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if stats.is_none() {
        return Ok(Json(vec![]));
    }

    let stats = stats.unwrap();

    // Get badges user doesn't have yet
    let available_badges = sqlx::query!(
        r#"
        SELECT b.id, b.name, b.description, b.icon, b.category, b.rarity, 
               b.is_secret, b.requirement_type, b.requirement_value
        FROM badges b
        WHERE b.id NOT IN (
            SELECT badge_id FROM user_badges WHERE user_id = $1
        )
        AND b.requirement_type = 'count'
        AND b.is_secret = FALSE
        ORDER BY b.requirement_value
        "#,
        user_uuid
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut progress_list = vec![];

    for badge in available_badges {
        let current = match badge.name.as_str() {
            name if name.contains("Message") && !name.contains("DM") && !name.contains("Private") => stats.messages_sent.unwrap_or(0),
            name if name.contains("DM") || name.contains("Whisper") || name.contains("Private") || name.contains("Confidant") || name.contains("Secret Keeper") => stats.dms_sent.unwrap_or(0),
            name if name.contains("Friend") || name.contains("Ice Breaker") || name.contains("Social") => stats.friends_added.unwrap_or(0),
            name if name.contains("Join") || name.contains("New Member") || name.contains("Explorer") || name.contains("Hopper") || name.contains("Omnipresent") => stats.servers_joined.unwrap_or(0),
            name if name.contains("Create") || name.contains("Founder") || name.contains("Builder") || name.contains("Architect") => stats.servers_created.unwrap_or(0),
            name if name.contains("React") || name.contains("Impression") || name.contains("Expressive") || name.contains("Emoji Enthusiast") => stats.reactions_given.unwrap_or(0),
            name if name.contains("Voice") || name.contains("Mic") || name.contains("Podcast") || name.contains("Radio") => stats.voice_minutes.unwrap_or(0),
            name if name.contains("Upload") || name.contains("File") || name.contains("Share") || name.contains("Data") || name.contains("Cloud") => stats.files_uploaded.unwrap_or(0),
            name if name.contains("Active") || name.contains("Week") || name.contains("Monthly") || name.contains("Quarterly") || name.contains("Veteran") || name.contains("Ancient") => stats.days_active.unwrap_or(0),
            _ => 0,
        };

        let required = badge.requirement_value.unwrap_or(1);
        let percentage = if required > 0 {
            (current as f32 / required as f32 * 100.0).min(100.0)
        } else {
            0.0
        };

        progress_list.push(BadgeProgress {
            badge: Badge {
                id: badge.id.to_string(),
                name: badge.name,
                description: badge.description,
                icon: badge.icon,
                category: badge.category,
                rarity: badge.rarity,
                is_secret: badge.is_secret.unwrap_or(false),
            },
            current,
            required,
            percentage,
        });
    }

    Ok(Json(progress_list))
}

// Internal function to check and award badges (called after stat updates)
pub async fn check_and_award_badges(
    state: &AppState,
    user_id: &Uuid,
    stat_type: &str,
    new_value: i32,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut awarded_badges = vec![];

    // Get badges that match this stat type and value
    let badges = sqlx::query!(
        r#"
        SELECT b.id, b.name
        FROM badges b
        WHERE b.requirement_type = 'count'
        AND b.requirement_value <= $1
        AND b.id NOT IN (
            SELECT badge_id FROM user_badges WHERE user_id = $2
        )
        "#,
        new_value,
        user_id
    )
    .fetch_all(&state.db)
    .await?;

    for badge in badges {
        // Check if this badge matches the stat type
        let matches = match stat_type {
            "messages_sent" => badge.name.contains("Hello World") || badge.name.contains("Chatterbox") || badge.name.contains("Conversationalist") || badge.name.contains("Town Crier") || badge.name.contains("Voice of the People"),
            "dms_sent" => badge.name.contains("Whisper") || badge.name.contains("Private Messenger") || badge.name.contains("Confidant") || badge.name.contains("Secret Keeper"),
            "friends_added" => badge.name.contains("Ice Breaker") || badge.name.contains("Friend Collector") || badge.name.contains("Social Circle") || badge.name.contains("Social Butterfly") || badge.name.contains("Everyone Knows You"),
            "servers_joined" => badge.name.contains("New Member") || badge.name.contains("Community Explorer") || badge.name.contains("Server Hopper") || badge.name.contains("Omnipresent"),
            "servers_created" => badge.name.contains("Founder") || badge.name.contains("Empire Builder") || badge.name.contains("Network Architect"),
            "reactions_given" => badge.name.contains("First Impression") || badge.name.contains("Expressive") || badge.name.contains("Emoji Enthusiast") || badge.name.contains("Reaction Master"),
            "voice_minutes" => badge.name.contains("Mic Check") || badge.name.contains("Voice Chatter") || badge.name.contains("Podcast Host") || badge.name.contains("Radio Star"),
            "files_uploaded" => badge.name.contains("First Share") || badge.name.contains("File Sharer") || badge.name.contains("Data Hoarder") || badge.name.contains("Cloud Storage"),
            _ => false,
        };

        if matches {
            // Award the badge
            sqlx::query!(
                "INSERT INTO user_badges (user_id, badge_id, progress) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                user_id,
                badge.id,
                new_value
            )
            .execute(&state.db)
            .await?;

            awarded_badges.push(badge.name);
        }
    }

    Ok(awarded_badges)
}
