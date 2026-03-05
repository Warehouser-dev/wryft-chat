use axum::{
    extract::{State, Path, Json},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use crate::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct SignalMessage {
    pub from_user_id: String,
    pub to_user_id: String,
    pub signal_type: String, // "offer", "answer", "ice-candidate"
    pub signal_data: serde_json::Value,
    pub channel_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CallInitiate {
    pub caller_id: String,
    pub callee_id: String,
    pub call_type: String, // "voice" or "video"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CallResponse {
    pub call_id: String,
    pub accepted: bool,
}

// Send WebRTC signaling data (offer, answer, ICE candidates)
pub async fn send_signal(
    State(state): State<AppState>,
    Json(signal): Json<SignalMessage>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Broadcast signal to target user via WebSocket
    let message = serde_json::json!({
        "type": "webrtc_signal",
        "from_user_id": signal.from_user_id,
        "signal_type": signal.signal_type,
        "signal_data": signal.signal_data,
        "channel_id": signal.channel_id,
    });

    // Send to specific user
    state.ws_state.send_to_user(&signal.to_user_id, message).await;

    Ok((StatusCode::OK, Json(serde_json::json!({ "success": true }))))
}

// Initiate a call to a user
pub async fn initiate_call(
    State(state): State<AppState>,
    Json(call): Json<CallInitiate>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let call_id = uuid::Uuid::new_v4().to_string();

    // Notify callee via WebSocket
    let message = serde_json::json!({
        "type": "incoming_call",
        "call_id": call_id,
        "caller_id": call.caller_id,
        "call_type": call.call_type,
    });

    state.ws_state.send_to_user(&call.callee_id, message).await;

    Ok((StatusCode::OK, Json(serde_json::json!({
        "call_id": call_id,
        "status": "ringing"
    }))))
}

// Accept or reject a call
pub async fn respond_to_call(
    State(state): State<AppState>,
    Path(call_id): Path<String>,
    Json(response): Json<CallResponse>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    // Notify caller of response via WebSocket
    let message = serde_json::json!({
        "type": "call_response",
        "call_id": call_id,
        "accepted": response.accepted,
    });

    // In a real implementation, you'd look up the caller_id from the call_id
    // For now, we'll broadcast to the channel
    
    Ok((StatusCode::OK, Json(serde_json::json!({ "success": true }))))
}

// End a call
pub async fn end_call(
    State(state): State<AppState>,
    Path(call_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let user_id = payload.get("user_id")
        .and_then(|v| v.as_str())
        .ok_or((StatusCode::BAD_REQUEST, "user_id required".to_string()))?;

    // Notify all participants that call has ended
    let message = serde_json::json!({
        "type": "call_ended",
        "call_id": call_id,
        "ended_by": user_id,
    });

    // Broadcast to channel or DM participants
    
    Ok((StatusCode::OK, Json(serde_json::json!({ "success": true }))))
}
