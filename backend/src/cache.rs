use deadpool_redis::{Config, Pool, Runtime};
use redis::AsyncCommands;
use std::time::Duration;

#[derive(Clone)]
pub struct RedisCache {
    pool: Pool,
}

impl RedisCache {
    pub fn new(redis_url: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let cfg = Config::from_url(redis_url);
        let pool = cfg.create_pool(Some(Runtime::Tokio1))?;
        Ok(Self { pool })
    }

    // Get presence from cache
    pub async fn get_presence(&self, user_id: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
        let mut conn = self.pool.get().await?;
        let key = format!("presence:{}", user_id);
        let result: Option<String> = conn.get(&key).await?;
        Ok(result)
    }

    // Set presence in cache with TTL
    pub async fn set_presence(&self, user_id: &str, status: &str, ttl_secs: u64) -> Result<(), Box<dyn std::error::Error>> {
        let mut conn = self.pool.get().await?;
        let key = format!("presence:{}", user_id);
        conn.set_ex::<_, _, ()>(&key, status, ttl_secs).await?;
        Ok(())
    }

    // Get multiple presences (bulk)
    pub async fn get_bulk_presence(&self, user_ids: &[String]) -> Result<Vec<Option<String>>, Box<dyn std::error::Error>> {
        let mut conn = self.pool.get().await?;
        let keys: Vec<String> = user_ids.iter().map(|id| format!("presence:{}", id)).collect();
        
        if keys.is_empty() {
            return Ok(vec![]);
        }
        
        let results: Vec<Option<String>> = redis::cmd("MGET")
            .arg(&keys)
            .query_async(&mut *conn)
            .await?;
        
        Ok(results)
    }

    // Delete presence from cache
    pub async fn delete_presence(&self, user_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut conn = self.pool.get().await?;
        let key = format!("presence:{}", user_id);
        conn.del::<_, ()>(&key).await?;
        Ok(())
    }

    // Check if cache is healthy
    pub async fn health_check(&self) -> bool {
        match self.pool.get().await {
            Ok(mut conn) => {
                redis::cmd("PING")
                    .query_async::<_, String>(&mut *conn)
                    .await
                    .is_ok()
            }
            Err(_) => false,
        }
    }
}
