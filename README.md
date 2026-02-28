# Wryft Chat

Modern real-time chat platform built with React and Rust.

## Features

- 💬 Real-time messaging
- 🎮 Discord-like servers & channels
- 👥 Friends system
- 🔊 Voice channels
- 🔐 Secure authentication
- 📁 File uploads
- ⭐ Premium features

## Quick Start

```bash
# Clone
git clone https://github.com/Warehouser-dev/wryft-chat.git
cd wryft-chat

# Start services
docker-compose up -d

# Setup database
createdb wryft
for f in backend/migrations/*.sql; do psql -d wryft -f "$f"; done

# Start backend
cd backend && cargo run

# Start frontend (new terminal)
cd wryft-web && npm install && npm run dev
```

Open http://localhost:5173

## Documentation

Full documentation at [docs.wryft.chat](https://docs.wryft.chat) (or run `mintlify dev` in the `docs/` folder)

## Tech Stack

- **Frontend**: React, Vite, WebSocket
- **Backend**: Rust (Axum), PostgreSQL, Redis
- **Storage**: MinIO (S3-compatible)

## Project Structure

```
wryft-chat/
├── backend/       # Rust API
├── wryft-web/     # React frontend
├── homepage/      # Landing page
├── docs/          # Mintlify docs
└── docker-compose.yml
```

## License

See [LICENSE](LICENSE)
