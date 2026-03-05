use axum::{
    extract::{ws::WebSocket, ws::Message, State, WebSocketUpgrade, Query},
    response::Response,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use std::time::{Duration, Instant};

use crate::AppState;

// Connection tracking
#[derive(Clone)]
pub struct ConnectionInfo {
    pub last_activity: Instant,
    pub connection_count: usize,
}

#[derive(Clone)]
pub struct WsState {
    pub channels: Arc<RwLock<HashMap<String, broadcast::Sender<String>>>>,
    pub user_connections: Arc<RwLock<HashMap<String, ConnectionInfo>>>,
}

impl WsState {
    pub fn new() -> Self {
        let state = Self {
            channels: Arc::new(RwLock::new(HashMap::new())),
            user_connections: Arc::new(RwLock::new(HashMap::new())),
        };
        
        // Spawn cleanup task
        let state_clone = state.clone();
        tokio::spawn(async move {
            state_clone.cleanup_task().await;
        });
        
        state
    }

    pub async fn get_or_create_channel(&self, channel: &str) -> broadcast::Sender<String> {
        let mut channels = self.channels.write().await;
        channels
            .entry(channel.to_string())
            .or_insert_with(|| broadcast::channel(100).0)
            .clone()
    }

    pub async fn broadcast_to_all(&self, message: &str) {
        let channels = self.channels.read().await;
        for sender in channels.values() {
            let _ = sender.send(message.to_string());
        }
    }
    
    // Send message to specific user
    pub async fn send_to_user(&self, user_id: &str, message: serde_json::Value) {
        let channel_name = format!("user-{}", user_id);
        let channels = self.channels.read().await;
        
        println!("🔍 Looking for channel: {}", channel_name);
        println!("📋 Available channels: {:?}", channels.keys().collect::<Vec<_>>());
        
        if let Some(sender) = channels.get(&channel_name) {
            println!("✅ Found channel, sending message. Receiver count: {}", sender.receiver_count());
            let _ = sender.send(message.to_string());
        } else {
            println!("❌ Channel not found: {}", channel_name);
        }
    }
    
    // Track user connection
    pub async fn track_connection(&self, user: &str) -> Result<(), String> {
        let mut connections = self.user_connections.write().await;
        
        if let Some(info) = connections.get_mut(user) {
            // Limit to 5 connections per user
            if info.connection_count >= 5 {
                return Err("Too many connections".to_string());
            }
            info.connection_count += 1;
            info.last_activity = Instant::now();
        } else {
            connections.insert(user.to_string(), ConnectionInfo {
                last_activity: Instant::now(),
                connection_count: 1,
            });
        }
        
        Ok(())
    }
    
    // Untrack user connection
    pub async fn untrack_connection(&self, user: &str) {
        let mut connections = self.user_connections.write().await;
        
        if let Some(info) = connections.get_mut(user) {
            info.connection_count = info.connection_count.saturating_sub(1);
            info.last_activity = Instant::now();
            
            // Remove if no more connections
            if info.connection_count == 0 {
                connections.remove(user);
            }
        }
    }
    
    // Cleanup inactive channels every 5 minutes
    async fn cleanup_task(&self) {
        let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
        
        loop {
            interval.tick().await;
            
            let mut channels = self.channels.write().await;
            let mut to_remove = Vec::new();
            
            for (channel_name, sender) in channels.iter() {
                // If no receivers, mark for removal
                if sender.receiver_count() == 0 {
                    to_remove.push(channel_name.clone());
                }
            }
            
            for channel_name in to_remove {
                channels.remove(&channel_name);
                println!("🧹 Cleaned up inactive channel: {}", channel_name);
            }
            
            println!("📊 Active channels: {}", channels.len());
        }
    }
}

#[derive(Deserialize)]
pub struct WsQuery {
    channel: String,
    user: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum WsMessage {
    #[serde(rename = "message")]
    Message {
        id: String,
        channel: String,
        content: String,
        author: String,
        timestamp: String,
    },
    #[serde(rename = "message_edited")]
    MessageEdited {
        id: String,
        channel: String,
        content: String,
    },
    #[serde(rename = "message_deleted")]
    MessageDeleted {
        id: String,
        channel: String,
    },
    #[serde(rename = "typing")]
    Typing {
        channel: String,
        user: String,
    },
    #[serde(rename = "user_joined")]
    UserJoined { user: String },
    #[serde(rename = "user_left")]
    UserLeft { user: String },
    #[serde(rename = "voice_join")]
    VoiceJoin {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(rename = "peerId")]
        peer_id: String,
        username: String,
    },
    #[serde(rename = "voice_leave")]
    VoiceLeave {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(rename = "peerId")]
        peer_id: String,
    },
    #[serde(rename = "voice_offer")]
    VoiceOffer {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(rename = "targetPeerId")]
        target_peer_id: String,
        #[serde(rename = "peerId")]
        peer_id: String,
        offer: serde_json::Value,
    },
    #[serde(rename = "voice_answer")]
    VoiceAnswer {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(rename = "targetPeerId")]
        target_peer_id: String,
        #[serde(rename = "peerId")]
        peer_id: String,
        answer: serde_json::Value,
    },
    #[serde(rename = "voice_ice_candidate")]
    VoiceIceCandidate {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(rename = "targetPeerId")]
        target_peer_id: String,
        #[serde(rename = "peerId")]
        peer_id: String,
        candidate: serde_json::Value,
    },
    #[serde(rename = "voice_heartbeat")]
    VoiceHeartbeat {
        #[serde(rename = "channelId")]
        channel_id: String,
        #[serde(rename = "peerId")]
        peer_id: String,
    },
    #[serde(rename = "presence_update")]
    PresenceUpdate {
        #[serde(rename = "userId")]
        user_id: String,
        status: String,
    },
    #[serde(rename = "webrtc_signal")]
    WebRTCSignal {
        from_user_id: String,
        to_user_id: String,
        signal_type: String,
        signal_data: serde_json::Value,
        channel_id: Option<String>,
    },
    #[serde(rename = "incoming_call")]
    IncomingCall {
        call_id: String,
        caller_id: String,
        call_type: String,
    },
    #[serde(rename = "call_response")]
    CallResponse {
        call_id: String,
        accepted: bool,
    },
    #[serde(rename = "call_ended")]
    CallEnded {
        call_id: String,
        ended_by: String,
    },
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(query): Query<WsQuery>,
) -> Response {
    // Check connection limit
    if let Err(e) = state.ws_state.track_connection(&query.user).await {
        println!("❌ Connection rejected for {}: {}", query.user, e);
        return Response::builder()
            .status(429)
            .body("Too many connections".into())
            .unwrap();
    }
    
    ws.on_upgrade(move |socket| handle_socket(socket, state, query.channel, query.user))
}

async fn handle_socket(socket: WebSocket, state: AppState, channel: String, username: String) {
    let (mut sender, mut receiver) = socket.split();
    
    let ws_state = state.ws_state.clone();
    let tx = ws_state.get_or_create_channel(&channel).await;
    let mut rx = tx.subscribe();

    // Send join message
    let join_msg = WsMessage::UserJoined {
        user: username.clone(),
    };
    let _ = tx.send(serde_json::to_string(&join_msg).unwrap());

    // Spawn task to forward broadcast messages to this client
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages from this client
    let tx_clone = tx.clone();
    let ws_state_clone = ws_state.clone();
    let _username_clone = username.clone();
    let channel_clone = channel.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            println!("📨 Received message on channel {}: {}", channel_clone, text);
            
            if let Ok(ws_msg) = serde_json::from_str::<serde_json::Value>(&text) {
                // Check message type
                if let Some(msg_type) = ws_msg.get("type").and_then(|t| t.as_str()) {
                    println!("🔊 Message type: {}", msg_type);
                    
                    // Handle WebRTC signaling for DM calls
                    if msg_type == "webrtc_signal" {
                        if let Some(to_user_id) = ws_msg.get("to_user_id").and_then(|v| v.as_str()) {
                            println!("📞 Routing WebRTC signal to user: {}", to_user_id);
                            ws_state_clone.send_to_user(to_user_id, ws_msg.clone()).await;
                            continue;
                        }
                    }
                    
                    // Handle incoming call notifications
                    if msg_type == "incoming_call" {
                        if let Some(callee_id) = ws_msg.get("callee_id").and_then(|v| v.as_str()) {
                            println!("📞 Routing incoming call to user: {}", callee_id);
                            ws_state_clone.send_to_user(callee_id, ws_msg.clone()).await;
                            continue;
                        }
                    }
                    
                    // Handle call response
                    if msg_type == "call_response" {
                        // Route back to the caller
                        if let Some(caller_id) = ws_msg.get("caller_id").and_then(|v| v.as_str()) {
                            println!("📞 Routing call response to caller: {}", caller_id);
                            ws_state_clone.send_to_user(caller_id, ws_msg.clone()).await;
                            continue;
                        }
                    }
                    
                    // Handle call ended
                    if msg_type == "call_ended" {
                        // Broadcast to both users in the call
                        if let Some(other_user_id) = ws_msg.get("other_user_id").and_then(|v| v.as_str()) {
                            println!("📞 Routing call ended to user: {}", other_user_id);
                            ws_state_clone.send_to_user(other_user_id, ws_msg.clone()).await;
                            continue;
                        }
                    }
                    
                    if msg_type.starts_with("voice_") {
                        // For voice_heartbeat, don't broadcast
                        if msg_type == "voice_heartbeat" {
                            println!("💓 Heartbeat received");
                            continue;
                        }
                        
                        // For voice_join, broadcast to others that this user joined
                        if msg_type == "voice_join" {
                            let join_broadcast = serde_json::json!({
                                "type": "voice_user_joined",
                                "peerId": ws_msg.get("peerId"),
                                "username": ws_msg.get("username"),
                                "channelId": ws_msg.get("channelId"),
                            });
                            println!("📢 Broadcasting join: {}", join_broadcast);
                            let _ = tx_clone.send(join_broadcast.to_string());
                            continue;
                        } 
                        
                        if msg_type == "voice_leave" {
                            let leave_broadcast = serde_json::json!({
                                "type": "voice_user_left",
                                "peerId": ws_msg.get("peerId"),
                                "channelId": ws_msg.get("channelId"),
                            });
                            println!("📢 Broadcasting leave: {}", leave_broadcast);
                            let _ = tx_clone.send(leave_broadcast.to_string());
                            continue;
                        }
                        
                        // For WebRTC signaling (offer, answer, ice_candidate), broadcast to all
                        // The frontend will filter by targetPeerId
                        println!("📤 Broadcasting voice signaling: {}", msg_type);
                    }
                }
                
                // Broadcast the message
                let _ = tx_clone.send(ws_msg.to_string());
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    // Send leave message
    let leave_msg = WsMessage::UserLeft {
        user: username.clone(),
    };
    let _ = tx.send(serde_json::to_string(&leave_msg).unwrap());
    
    // Untrack connection
    ws_state.untrack_connection(&username).await;
    println!("👋 User {} disconnected from channel {}", username, channel);
}
