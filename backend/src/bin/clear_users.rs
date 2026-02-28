use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");
    
    println!("⚠️  WARNING: This will DELETE ALL USER DATA from the database!");
    println!("⚠️  This action is IRREVERSIBLE!");
    println!("\nConnecting to database...");
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;
    
    println!("✓ Connected to database\n");
    
    // Count before deletion
    let user_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await?;
    println!("Found {} users to delete", user_count.0);
    
    let guild_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM guilds")
        .fetch_one(&pool)
        .await?;
    println!("Found {} guilds to delete", guild_count.0);
    
    let message_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM messages")
        .fetch_one(&pool)
        .await?;
    println!("Found {} messages to delete\n", message_count.0);
    
    println!("Starting deletion process...\n");
    
    // Helper function to delete from table if it exists
    async fn delete_if_exists(pool: &sqlx::PgPool, table: &str, description: &str) -> Result<u64, Box<dyn std::error::Error>> {
        match sqlx::query(&format!("DELETE FROM {}", table))
            .execute(pool)
            .await
        {
            Ok(result) => {
                println!("   ✓ Deleted {} {}", result.rows_affected(), description);
                Ok(result.rows_affected())
            }
            Err(e) => {
                if e.to_string().contains("does not exist") {
                    println!("   ⊘ Table '{}' does not exist, skipping", table);
                    Ok(0)
                } else {
                    Err(Box::new(e))
                }
            }
        }
    }
    
    // Delete in order to respect foreign key constraints
    
    println!("1. Deleting friendships...");
    delete_if_exists(&pool, "friendships", "friendships").await?;
    
    println!("2. Deleting reactions...");
    delete_if_exists(&pool, "reactions", "reactions").await?;
    
    println!("3. Deleting typing indicators...");
    delete_if_exists(&pool, "typing_indicators", "typing indicators").await?;
    
    println!("4. Deleting user presence...");
    delete_if_exists(&pool, "user_presence", "presence records").await?;
    
    println!("5. Deleting voice sessions...");
    delete_if_exists(&pool, "voice_sessions", "voice sessions").await?;
    
    println!("6. Deleting DM messages...");
    delete_if_exists(&pool, "dm_messages", "DM messages").await?;
    
    println!("7. Deleting direct message channels...");
    delete_if_exists(&pool, "direct_messages", "DM channels").await?;
    
    println!("8. Deleting channel messages...");
    delete_if_exists(&pool, "messages", "messages").await?;
    
    println!("9. Deleting invites...");
    delete_if_exists(&pool, "invites", "invites").await?;
    
    println!("10. Deleting channels...");
    delete_if_exists(&pool, "channels", "channels").await?;
    
    println!("11. Deleting guild members...");
    delete_if_exists(&pool, "guild_members", "guild members").await?;
    
    println!("12. Deleting guilds...");
    delete_if_exists(&pool, "guilds", "guilds").await?;
    
    println!("13. Deleting users...");
    let result = sqlx::query("DELETE FROM users")
        .execute(&pool)
        .await?;
    println!("   ✓ Deleted {} users", result.rows_affected());
    
    // Verify deletion
    println!("\n📊 Verification:");
    let user_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await?;
    println!("   Users remaining: {}", user_count.0);
    
    let guild_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM guilds")
        .fetch_one(&pool)
        .await?;
    println!("   Guilds remaining: {}", guild_count.0);
    
    let message_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM messages")
        .fetch_one(&pool)
        .await?;
    println!("   Messages remaining: {}", message_count.0);
    
    println!("\n✅ All user accounts and related data have been deleted successfully!");
    
    Ok(())
}
