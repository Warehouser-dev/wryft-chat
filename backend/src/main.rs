mod handlers;
mod models;
mod cache;
mod permissions;
mod storage;
mod middleware;

use axum::{
    routing::{get, post},
    Router,
    http::StatusCode,
    middleware as axum_middleware,
    Json,
};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, CorsLayer};
use axum::http::HeaderValue;
use tower_governor::{
    governor::GovernorConfigBuilder,
    GovernorLayer,
};
use serde_json::json;
use cache::RedisCache;

// Shared JWT secret - must match the one in handlers/auth.rs
pub const JWT_SECRET: &[u8] = b"my-secret-key-for-jwt-tokens-that-is-long-enough";

#[derive(Clone)]
pub struct AppState {
    db: sqlx::PgPool,
    ws_state: handlers::websocket::WsState,
    cache: Option<RedisCache>,
    storage: std::sync::Arc<storage::S3Storage>,
}

async fn health_check() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::OK, Json(json!({ "status": "ok" })))
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env file");
    
    let pool = PgPoolOptions::new()
        .max_connections(20) // Increased from 5 for better concurrency
        .min_connections(5)  // Keep some connections warm
        .acquire_timeout(std::time::Duration::from_secs(10))
        .idle_timeout(std::time::Duration::from_secs(600))
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");

    println!("Connected to database with connection pool (max: 20)!");

    // Initialize Redis cache (optional - graceful degradation if not available)
    let cache = match std::env::var("REDIS_URL") {
        Ok(redis_url) => {
            match RedisCache::new(&redis_url) {
                Ok(cache) => {
                    if cache.health_check().await {
                        println!("✅ Redis cache connected and healthy");
                        Some(cache)
                    } else {
                        println!("⚠️  Redis connection failed health check, running without cache");
                        None
                    }
                }
                Err(e) => {
                    println!("⚠️  Failed to initialize Redis cache: {}. Running without cache.", e);
                    None
                }
            }
        }
        Err(_) => {
            println!("ℹ️  REDIS_URL not set, running without cache");
            None
        }
    };

    // Initialize S3 storage
    let storage = storage::S3Storage::new().await.expect("Failed to initialize S3 storage");
    let storage = std::sync::Arc::new(storage);

    let state = AppState { 
        db: pool,
        ws_state: handlers::websocket::WsState::new(),
        cache,
        storage,
    };

    // Rate limiting configuration
    // Allow 100 requests per minute per IP for general endpoints
    let governor_conf = Box::new(
        GovernorConfigBuilder::default()
            .per_millisecond(60000) // 1 minute
            .burst_size(100) // 100 requests per minute
            .finish()
            .unwrap(),
    );

    // Stricter rate limiting for auth endpoints (10 per minute)
    let auth_governor_conf = Box::new(
        GovernorConfigBuilder::default()
            .per_millisecond(60000)
            .burst_size(10)
            .finish()
            .unwrap(),
    );

    let cors = if let Ok(allowed_origins) = std::env::var("ALLOWED_ORIGINS") {
        let origins: Vec<_> = allowed_origins
            .split(',')
            .filter_map(|s| s.trim().parse::<HeaderValue>().ok())
            .collect();
        
        if !origins.is_empty() {
            println!("CORS restricted to: {}", allowed_origins);
            CorsLayer::new()
                .allow_origin(origins)
                .allow_methods(Any)
                .allow_headers(Any)
                .allow_credentials(true)
        } else {
            println!("Warning: ALLOWED_ORIGINS set but invalid, allowing all origins");
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        }
    } else {
        println!("Warning: ALLOWED_ORIGINS not set, allowing all origins (development mode)");
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    // Auth routes WITHOUT rate limiting (temporarily disabled for debugging)
    let auth_routes = Router::new()
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login));

    // File Uploads with authentication and rate limiting
    let upload_routes = Router::new()
        .route("/api/upload/avatar", post(handlers::uploads::upload_avatar))
        .route("/api/upload/banner", post(handlers::uploads::upload_banner))
        .route("/api/upload/icon", post(handlers::uploads::upload_icon))
        .route("/api/upload/emoji", post(handlers::uploads::upload_emoji))
        .route("/api/upload/attachment", post(handlers::uploads::upload_attachment))
        .layer(axum_middleware::from_fn_with_state(state.clone(), middleware::rate_limit::upload_rate_limit))
        .layer(axum_middleware::from_fn(middleware::auth::auth_middleware))
        .with_state(state.clone());

    // Main app routes with general rate limiting
    let app = Router::new()
        .route("/api/messages/:channel", get(handlers::messages::get_messages))
        .route("/api/messages/:channel", post(handlers::messages::send_message))
        .route("/api/messages/:channel/:message_id", axum::routing::patch(handlers::messages::edit_message))
        .route("/api/messages/:channel/:message_id", axum::routing::delete(handlers::messages::delete_message))
        .route("/api/guilds", get(handlers::guilds::get_user_guilds))
        .route("/api/guilds", post(handlers::guilds::create_guild))
        .route("/api/guilds/public", get(handlers::guilds::get_public_guilds))
        .route("/api/guilds/:guild_id", axum::routing::patch(handlers::guilds::update_guild))
        .route("/api/guilds/:guild_id", axum::routing::delete(handlers::guilds::delete_guild))
        .route("/api/guilds/:guild_id/settings", axum::routing::patch(handlers::guilds::update_guild_settings))
        .route("/api/guilds/:guild_id/members", get(handlers::guilds::get_guild_members))
        .route("/api/guilds/:guild_id/channels", get(handlers::channels::get_guild_channels))
        .route("/api/guilds/:guild_id/channels", post(handlers::channels::create_channel))
        .route("/api/guilds/:guild_id/channels/:channel_id", axum::routing::delete(handlers::channels::delete_channel))
        // Channel Permissions
        .route("/api/guilds/:guild_id/channels/:channel_id/permissions", get(handlers::channels::get_channel_permissions))
        .route("/api/guilds/:guild_id/channels/:channel_id/permissions", post(handlers::channels::create_channel_permission))
        .route("/api/guilds/:guild_id/channels/:channel_id/permissions/:permission_id", axum::routing::patch(handlers::channels::update_channel_permission))
        .route("/api/guilds/:guild_id/channels/:channel_id/permissions/:permission_id", axum::routing::delete(handlers::channels::delete_channel_permission))
        // Categories
        .route("/api/guilds/:guild_id/categories", get(handlers::channels::get_guild_categories))
        .route("/api/guilds/:guild_id/categories", post(handlers::channels::create_category))
        .route("/api/guilds/:guild_id/categories/:category_id", axum::routing::patch(handlers::channels::update_category))
        .route("/api/guilds/:guild_id/categories/:category_id", axum::routing::delete(handlers::channels::delete_category))
        .route("/api/guilds/:guild_id/invites", post(handlers::invites::create_invite))
        .route("/api/invites/:code", get(handlers::invites::get_invite_info))
        .route("/api/invites/:code/join", post(handlers::invites::join_guild))
        .route("/api/guilds/:guild_id/leave", post(handlers::invites::leave_guild))
        .route("/api/guilds/:guild_id/voice", get(handlers::voice::get_guild_voice_users))
        // Roles
        .route("/api/guilds/:guild_id/roles", get(handlers::roles::get_guild_roles))
        .route("/api/guilds/:guild_id/roles", post(handlers::roles::create_role))
        .route("/api/guilds/:guild_id/roles/:role_id", axum::routing::patch(handlers::roles::update_role))
        .route("/api/guilds/:guild_id/roles/:role_id", axum::routing::delete(handlers::roles::delete_role))
        .route("/api/guilds/:guild_id/roles/:role_id/members", post(handlers::roles::assign_role))
        .route("/api/guilds/:guild_id/roles/:role_id/members/:user_id", axum::routing::delete(handlers::roles::remove_role))
        .route("/api/guilds/:guild_id/members/:user_id/roles", get(handlers::roles::get_user_roles))
        // Audit Logs
        .route("/api/guilds/:guild_id/audit-logs", get(handlers::audit_logs::get_guild_audit_logs))
        // Custom Emoji
        .route("/api/guilds/:guild_id/emoji", get(handlers::emoji::get_guild_emoji))
        .route("/api/guilds/:guild_id/emoji", post(handlers::emoji::create_emoji))
        .route("/api/guilds/:guild_id/emoji/:emoji_id", axum::routing::delete(handlers::emoji::delete_emoji))
        // File Serving (with optional auth for public files)
        .route("/api/files/:file_id", get(handlers::files::serve_file))
        .route("/api/voice/:channel_id/join", post(handlers::voice::join_voice_channel))
        .route("/api/voice/:channel_id/leave", post(handlers::voice::leave_voice_channel))
        .route("/api/voice/:channel_id/heartbeat", post(handlers::voice::heartbeat_voice_channel))
        .route("/api/dms/:user_id", get(handlers::dms::get_user_dms))
        .route("/api/dms/:current_user_id/:other_user_id", get(handlers::dms::get_or_create_dm))
        .route("/api/dms/:user_id/:dm_id/messages", get(handlers::dms::get_dm_messages))
        .route("/api/dms/:user_id/:dm_id/messages", post(handlers::dms::send_dm_message))
        .route("/api/dms/:user_id/:dm_id/messages/:message_id", axum::routing::patch(handlers::dms::edit_dm_message))
        .route("/api/dms/:user_id/:dm_id/messages/:message_id", axum::routing::delete(handlers::dms::delete_dm_message))
        .route("/api/users/:user_id", get(handlers::users::get_user_profile))
        .route("/api/users/:user_id/profile", axum::routing::patch(handlers::users::update_user_profile))
        .route("/api/users/:user_id/status", axum::routing::patch(handlers::users::update_custom_status))
        .route("/api/users/:user_id/privacy", axum::routing::patch(handlers::users::update_privacy_settings))
        .route("/api/users/:current_user_id/mutual-guilds/:target_user_id", get(handlers::users::get_mutual_guilds))
        .route("/api/users/:current_user_id/mutual-friends/:target_user_id", get(handlers::users::get_mutual_friends))
        // Reactions
        .route("/api/messages/:message_id/reactions", post(handlers::reactions::add_reaction))
        .route("/api/messages/:message_id/reactions/:emoji", axum::routing::delete(handlers::reactions::remove_reaction))
        .route("/api/messages/:message_id/reactions", get(handlers::reactions::get_message_reactions))
        .route("/api/dms/messages/:message_id/reactions", post(handlers::reactions::add_dm_reaction))
        .route("/api/dms/messages/:message_id/reactions/:emoji", axum::routing::delete(handlers::reactions::remove_dm_reaction))
        .route("/api/dms/messages/:message_id/reactions", get(handlers::reactions::get_dm_message_reactions))
        // Presence
        .route("/api/presence", post(handlers::presence::update_presence))
        .route("/api/presence/heartbeat", post(handlers::presence::heartbeat))
        .route("/api/presence/bulk", post(handlers::presence::get_bulk_presence))
        .route("/api/presence/:user_id", get(handlers::presence::get_user_presence))
        .route("/api/guilds/:guild_id/presence", get(handlers::presence::get_guild_presence))
        // Typing indicators
        .route("/api/channels/:channel_id/typing", post(handlers::typing::start_typing))
        .route("/api/channels/:channel_id/typing", axum::routing::delete(handlers::typing::stop_typing))
        .route("/api/channels/:channel_id/typing", get(handlers::typing::get_typing_users))
        .route("/api/dms/:dm_id/typing", post(handlers::typing::start_dm_typing))
        .route("/api/dms/:dm_id/typing", axum::routing::delete(handlers::typing::stop_dm_typing))
        .route("/api/dms/:dm_id/typing", get(handlers::typing::get_dm_typing_users))
        // Friends
        .route("/api/friends", get(handlers::friends::get_friends))
        .route("/api/friends/requests", post(handlers::friends::send_friend_request))
        .route("/api/friends/requests/pending", get(handlers::friends::get_pending_requests))
        .route("/api/friends/requests/outgoing", get(handlers::friends::get_outgoing_requests))
        .route("/api/friends/requests/:friendship_id/accept", post(handlers::friends::accept_friend_request))
        .route("/api/friends/requests/:friendship_id/decline", post(handlers::friends::decline_friend_request))
        .route("/api/friends/:friend_user_id", axum::routing::delete(handlers::friends::remove_friend))
        .route("/api/friends/block/:user_id", post(handlers::friends::block_user))
        .route("/api/friends/block/:user_id", axum::routing::delete(handlers::friends::unblock_user))
        .route("/api/friends/blocked", get(handlers::friends::get_blocked_users))
        .route("/ws", get(handlers::websocket::ws_handler))
        .merge(upload_routes)
        .merge(auth_routes)
        // Rate limiting temporarily disabled
        // .layer(GovernorLayer {
        //     config: Box::leak(governor_conf),
        // })
        .layer(cors.clone())
        .with_state(state.clone());
    
    // Health check without rate limiting but with CORS
    let health_router = Router::new()
        .route("/api/health", get(health_check))
        .layer(cors)
        .with_state(state);
    
    // Merge all routes
    let final_app = Router::new()
        .merge(health_router)
        .merge(app);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let addr = format!("0.0.0.0:{}", port);
    
    println!("Server running on http://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, final_app).await.unwrap();
}
