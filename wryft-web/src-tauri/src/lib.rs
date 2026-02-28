use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};
use std::sync::Mutex;
use tauri::State;

struct DiscordRpcState {
    client: Mutex<Option<DiscordIpcClient>>,
}

#[tauri::command]
fn init_discord_rpc(state: State<DiscordRpcState>) -> Result<(), String> {
    println!("🎮 Initializing Discord RPC...");
    let mut client = DiscordIpcClient::new("1436468151767535726")
        .map_err(|e| {
            println!("❌ Failed to create Discord RPC client: {}", e);
            format!("Failed to create Discord RPC client: {}", e)
        })?;
    
    client.connect()
        .map_err(|e| {
            println!("❌ Failed to connect to Discord: {}", e);
            format!("Failed to connect to Discord: {}", e)
        })?;
    
    println!("✅ Discord RPC connected successfully!");
    *state.client.lock().unwrap() = Some(client);
    Ok(())
}

#[tauri::command]
fn update_discord_presence(
    state: State<DiscordRpcState>,
    details: String,
    state_text: String,
    large_image: Option<String>,
    large_text: Option<String>,
) -> Result<(), String> {
    println!("🎮 Updating Discord presence: {} | {}", details, state_text);
    let mut client_guard = state.client.lock().unwrap();
    
    if let Some(client) = client_guard.as_mut() {
        let mut activity_builder = activity::Activity::new()
            .details(&details)
            .state(&state_text);
        
        // Build assets outside the if block so strings live long enough
        let default_text = String::new();
        let text_ref = large_text.as_ref().unwrap_or(&default_text);
        
        if let Some(ref img) = large_image {
            println!("🖼️  Setting large image: {}", img);
            activity_builder = activity_builder.assets(
                activity::Assets::new()
                    .large_image(img)
                    .large_text(text_ref)
            );
        }
        
        client.set_activity(activity_builder)
            .map_err(|e| {
                println!("❌ Failed to set activity: {}", e);
                format!("Failed to set activity: {}", e)
            })?;
        
        println!("✅ Discord presence updated!");
    } else {
        println!("⚠️  Discord client not initialized");
    }
    
    Ok(())
}

#[tauri::command]
fn clear_discord_presence(state: State<DiscordRpcState>) -> Result<(), String> {
    let mut client_guard = state.client.lock().unwrap();
    
    if let Some(client) = client_guard.as_mut() {
        client.clear_activity()
            .map_err(|e| format!("Failed to clear activity: {}", e))?;
    }
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .manage(DiscordRpcState {
        client: Mutex::new(None),
    })
    .invoke_handler(tauri::generate_handler![
        init_discord_rpc,
        update_discord_presence,
        clear_discord_presence
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
