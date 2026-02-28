use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");
    
    println!("Connecting to database...");
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;
    
    println!("✓ Connected to database\n");
    
    // Check users table structure
    println!("Checking users table structure:");
    let columns = sqlx::query!(
        r#"
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
        "#
    )
    .fetch_all(&pool)
    .await?;
    
    for col in columns {
        println!("  - {} ({}) nullable: {}", 
            col.column_name.unwrap_or_default(), 
            col.data_type.unwrap_or_default(),
            col.is_nullable.unwrap_or_default()
        );
    }
    
    // Try to insert a test user
    println!("\nTesting user insertion...");
    let test_email = format!("test_{}@example.com", uuid::Uuid::new_v4());
    let test_id = uuid::Uuid::new_v4();
    
    match sqlx::query!(
        "INSERT INTO users (id, email, username, discriminator, password_hash) VALUES ($1, $2, $3, $4, $5)",
        test_id,
        test_email,
        "testuser",
        "0001",
        "$2b$12$test_hash_value_for_testing_purposes_only"
    )
    .execute(&pool)
    .await {
        Ok(_) => {
            println!("✓ Test user inserted successfully");
            // Clean up
            sqlx::query!("DELETE FROM users WHERE id = $1", test_id)
                .execute(&pool)
                .await?;
            println!("✓ Test user cleaned up");
        }
        Err(e) => {
            println!("✗ Failed to insert test user: {}", e);
        }
    }
    
    Ok(())
}
