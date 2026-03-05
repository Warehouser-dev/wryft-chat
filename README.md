# Wryft Chat

Modern real-time chat platform built with React and Rust.

## Features

- 💬 Real-time messaging with reactions and file attachments
- 🎮 Discord-like servers & channels with categories
- 👥 Friends system with @username handles
- 🔊 Voice & video calls with WebRTC
- 🔐 Secure authentication with JWT
- 📁 File uploads with MinIO storage
- ⭐ Premium features (animated avatars, custom themes)
- 🏆 Achievement badges system
- 🔔 Desktop notifications
- 🎨 Custom emoji support
- 👑 Role-based permissions

## Documentation

📚 **[View Full Documentation](https://wryft-143fa83c.mintlify.app/introduction)**

- [Installation Guide](https://wryft-143fa83c.mintlify.app/installation)
- [API Reference](https://wryft-143fa83c.mintlify.app/api-reference)
- [Development Setup](https://wryft-143fa83c.mintlify.app/development)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Warehouser-dev/wryft-chat.git
cd wryft-chat

# Start services (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Setup database
createdb wryft
for f in backend/migrations/*.sql; do psql -d wryft -f "$f"; done

# Start backend
cd backend && cargo run

# Start frontend (new terminal)
cd wryft-web2 && npm install && npm run dev
```

Open http://localhost:5173

## Tech Stack

- **Frontend**: React, Vite, WebSocket
- **Backend**: Rust (Axum), PostgreSQL, Redis
- **Storage**: MinIO (S3-compatible)
- **Real-time**: WebSocket for messaging, WebRTC for voice/video

## Project Structure

```
wryft-chat/
├── backend/           # Rust API server
├── wryft-web2/        # React frontend (main)
├── admin-panel/       # Admin dashboard
├── landing-site/      # Marketing site
├── docs/              # Mintlify documentation
└── docker-compose.yml # Service orchestration
```

## Contributing

Contributions are welcome! Please check out the [documentation](https://wryft-143fa83c.mintlify.app/introduction) for development guidelines.

## License

See [LICENSE](LICENSE)

