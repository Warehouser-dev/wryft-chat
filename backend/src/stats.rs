// Stats tracking utility for badge system
use sqlx::PgPool;
use uuid::Uuid;

pub async fn increment_stat(
    db: &PgPool,
    user_id: &Uuid,
    stat_name: &str,
    amount: i32,
) -> Result<i32, sqlx::Error> {
    // Ensure user_stats entry exists
    sqlx::query!(
        "INSERT INTO user_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
        user_id
    )
    .execute(db)
    .await?;

    // Update the specific stat and return new value
    let new_value = match stat_name {
        "messages_sent" => {
            let result = sqlx::query!(
                "UPDATE user_stats SET messages_sent = messages_sent + $1, updated_at = NOW() WHERE user_id = $2 RETURNING messages_sent",
                amount,
                user_id
            )
            .fetch_one(db)
            .await?;
            result.messages_sent.unwrap_or(0)
        }
        "dms_sent" => {
            let result = sqlx::query!(
                "UPDATE user_stats SET dms_sent = dms_sent + $1, updated_at = NOW() WHERE user_id = $2 RETURNING dms_sent",
                amount,
                user_id
            )
            .fetch_one(db)
            .await?;
            result.dms_sent.unwrap_or(0)
        }
        "friends_added" => {
            let result = sqlx::query!(
                "UPDATE user_stats SET friends_added = friends_added + $1, updated_at = NOW() WHERE user_id = $2 RETURNING friends_added",
                amount,
                user_id
            )
            .fetch_one(db)
            .await?;
            result.friends_added.unwrap_or(0)
        }
        "servers_joined" => {
            let result = sqlx::query!(
                "UPDATE user_stats SET servers_joined = servers_joined + $1, updated_at = NOW() WHERE user_id = $2 RETURNING servers_joined",
                amount,
                user_id
            )
            .fetch_one(db)
            .await?;
            result.servers_joined.unwrap_or(0)
        }
        "servers_created" => {
            let result = sqlx::query!(
                "UPDATE user_stats SET servers_created = servers_created + $1, updated_at = NOW() WHERE user_id = $2 RETURNING servers_created",
                amount,
                user_id
            )
            .fetch_one(db)
            .await?;
            result.servers_created.unwrap_or(0)
        }
        "reactions_given" => {
            let result = sqlx::query!(
                "UPDATE user_stats SET reactions_given = reactions_given + $1, updated_at = NOW() WHERE user_id = $2 RETURNING reactions_given",
                amount,
                user_id
            )
            .fetch_one(db)
            .await?;
            result.reactions_given.unwrap_or(0)
        }
        "files_uploaded" => {
            let result = sqlx::query!(
                "UPDATE user_stats SET files_uploaded = files_uploaded + $1, updated_at = NOW() WHERE user_id = $2 RETURNING files_uploaded",
                amount,
                user_id
            )
            .fetch_one(db)
            .await?;
            result.files_uploaded.unwrap_or(0)
        }
        _ => 0,
    };

    Ok(new_value)
}

pub async fn update_daily_activity(db: &PgPool, user_id: &Uuid) -> Result<(), sqlx::Error> {
    // Check if user was active today
    let today = chrono::Utc::now().date_naive();
    
    let last_activity = sqlx::query!(
        "SELECT last_activity_date FROM user_stats WHERE user_id = $1",
        user_id
    )
    .fetch_optional(db)
    .await?;

    if let Some(record) = last_activity {
        if let Some(last_date) = record.last_activity_date {
            if last_date != today {
                // New day, increment days_active
                sqlx::query!(
                    "UPDATE user_stats SET days_active = days_active + 1, last_activity_date = $1, updated_at = NOW() WHERE user_id = $2",
                    today,
                    user_id
                )
                .execute(db)
                .await?;
            }
        } else {
            // First activity
            sqlx::query!(
                "UPDATE user_stats SET days_active = 1, last_activity_date = $1, updated_at = NOW() WHERE user_id = $2",
                today,
                user_id
            )
            .execute(db)
            .await?;
        }
    }

    Ok(())
}
