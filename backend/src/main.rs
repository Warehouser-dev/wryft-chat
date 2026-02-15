mod handlers;
mod models;

use axum::{
    routing::{get, post},
    Router,
    http::StatusCode,
    Json,
};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, CorsLayer};
use serde_json::json;

#[derive(Clone)]
pub struct AppState {
    db: sqlx::PgPool,
    ws_state: handlers::websocket::WsState,
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
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to Postgres");

    println!("Connected to database!");

    let state = AppState { 
        db: pool,
        ws_state: handlers::websocket::WsState::new(),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/messages/:channel", get(handlers::messages::get_messages))
        .route("/api/messages/:channel", post(handlers::messages::send_message))
        .route("/api/messages/:channel/:message_id", axum::routing::patch(handlers::messages::edit_message))
        .route("/api/messages/:channel/:message_id", axum::routing::delete(handlers::messages::delete_message))
        .route("/api/guilds", get(handlers::guilds::get_user_guilds))
        .route("/api/guilds", post(handlers::guilds::create_guild))
        .route("/api/guilds/:guild_id", axum::routing::patch(handlers::guilds::update_guild))
        .route("/api/guilds/:guild_id", axum::routing::delete(handlers::guilds::delete_guild))
        .route("/api/guilds/:guild_id/members", get(handlers::guilds::get_guild_members))
        .route("/api/guilds/:guild_id/channels", get(handlers::channels::get_guild_channels))
        .route("/api/guilds/:guild_id/channels", post(handlers::channels::create_channel))
        .route("/api/guilds/:guild_id/channels/:channel_id", axum::routing::delete(handlers::channels::delete_channel))
        .route("/api/guilds/:guild_id/invites", post(handlers::invites::create_invite))
        .route("/api/invites/:code", get(handlers::invites::get_invite_info))
        .route("/api/invites/:code/join", post(handlers::invites::join_guild))
        .route("/api/guilds/:guild_id/leave", post(handlers::invites::leave_guild))
        .route("/api/dms/:user_id", get(handlers::dms::get_user_dms))
        .route("/api/dms/:current_user_id/:other_user_id", get(handlers::dms::get_or_create_dm))
        .route("/api/dms/:user_id/:dm_id/messages", get(handlers::dms::get_dm_messages))
        .route("/api/dms/:user_id/:dm_id/messages", post(handlers::dms::send_dm_message))
        .route("/api/dms/:user_id/:dm_id/messages/:message_id", axum::routing::patch(handlers::dms::edit_dm_message))
        .route("/api/dms/:user_id/:dm_id/messages/:message_id", axum::routing::delete(handlers::dms::delete_dm_message))
        .route("/ws", get(handlers::websocket::ws_handler))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3001".to_string());
    let addr = format!("0.0.0.0:{}", port);
    
    println!("Server running on http://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
