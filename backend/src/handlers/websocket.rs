use axum::{
    extract::{ws::WebSocket, ws::Message, State, WebSocketUpgrade, Query},
    response::Response,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};

use crate::AppState;

#[derive(Clone)]
pub struct WsState {
    pub channels: Arc<RwLock<HashMap<String, broadcast::Sender<String>>>>,
}

impl WsState {
    pub fn new() -> Self {
        Self {
            channels: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn get_or_create_channel(&self, channel: &str) -> broadcast::Sender<String> {
        let mut channels = self.channels.write().await;
        channels
            .entry(channel.to_string())
            .or_insert_with(|| broadcast::channel(100).0)
            .clone()
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
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(query): Query<WsQuery>,
) -> Response {
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
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                match ws_msg {
                    WsMessage::Message { .. } | 
                    WsMessage::MessageEdited { .. } | 
                    WsMessage::MessageDeleted { .. } | 
                    WsMessage::Typing { .. } => {
                        let _ = tx_clone.send(text);
                    }
                    _ => {}
                }
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
        user: username,
    };
    let _ = tx.send(serde_json::to_string(&leave_msg).unwrap());
}
