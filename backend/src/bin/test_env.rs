fn main() {
    dotenv::dotenv().ok();
    
    println!("Testing environment variable loading...\n");
    
    match std::env::var("JWT_SECRET") {
        Ok(secret) => {
            println!("✓ JWT_SECRET loaded successfully");
            println!("  Length: {}", secret.len());
            println!("  First 20 chars: {}", &secret[..20.min(secret.len())]);
        }
        Err(e) => {
            println!("✗ Failed to load JWT_SECRET: {:?}", e);
        }
    }
    
    match std::env::var("DATABASE_URL") {
        Ok(url) => {
            println!("✓ DATABASE_URL loaded successfully");
            println!("  Value: {}", url);
        }
        Err(e) => {
            println!("✗ Failed to load DATABASE_URL: {:?}", e);
        }
    }
    
    match std::env::var("PORT") {
        Ok(port) => {
            println!("✓ PORT loaded successfully");
            println!("  Value: {}", port);
        }
        Err(e) => {
            println!("✗ Failed to load PORT: {:?}", e);
        }
    }
}
