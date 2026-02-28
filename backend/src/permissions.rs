use sqlx::PgPool;
use uuid::Uuid;

/// Check if a user has a specific permission in a channel
pub async fn check_channel_permission(
    db: &PgPool,
    user_id: Uuid,
    channel_id: Uuid,
    permission_type: &str,
) -> Result<bool, sqlx::Error> {
    // Get the channel's guild
    let channel = sqlx::query!(
        "SELECT guild_id FROM channels WHERE id = $1",
        channel_id
    )
    .fetch_one(db)
    .await?;

    let guild_id = channel.guild_id;

    // Check if user is guild owner (owners have all permissions)
    let guild = sqlx::query!(
        "SELECT owner_id FROM guilds WHERE id = $1",
        guild_id
    )
    .fetch_one(db)
    .await?;

    if guild.owner_id == user_id {
        return Ok(true);
    }

    // Get user's membership in the guild
    let is_member = sqlx::query!(
        "SELECT 1 as exists FROM guild_members WHERE user_id = $1 AND guild_id = $2",
        user_id,
        guild_id
    )
    .fetch_optional(db)
    .await?;

    // If not a member, deny access
    if is_member.is_none() {
        return Ok(false);
    }

    // For now, all members have @everyone role which has all permissions
    // TODO: Implement proper role-based permissions
    let mut role_ids: Vec<Uuid> = vec![];
    
    // Add @everyone role (guild_id is the @everyone role id)
    role_ids.push(guild_id);

    // Get channel permissions for user's roles
    let permissions = sqlx::query!(
        r#"
        SELECT allow_view, allow_send_messages, allow_manage_messages
        FROM channel_permissions
        WHERE channel_id = $1 AND role_id = ANY($2)
        ORDER BY 
            CASE 
                WHEN role_id = $3 THEN 0  -- @everyone has lowest priority
                ELSE 1
            END DESC
        "#,
        channel_id,
        &role_ids,
        guild_id
    )
    .fetch_all(db)
    .await?;

    // If no permissions set, default to allow (for backward compatibility)
    if permissions.is_empty() {
        return Ok(true);
    }

    // Check the specific permission
    // Role-specific permissions override @everyone
    for perm in permissions {
        match permission_type {
            "view" => {
                if let Some(allow_view) = perm.allow_view {
                    return Ok(allow_view);
                }
            }
            "send_messages" => {
                if let Some(allow_send) = perm.allow_send_messages {
                    return Ok(allow_send);
                }
            }
            "manage_messages" => {
                if let Some(allow_manage) = perm.allow_manage_messages {
                    return Ok(allow_manage);
                }
            }
            _ => return Ok(false),
        }
    }

    // Default to deny if permission not found
    Ok(false)
}
