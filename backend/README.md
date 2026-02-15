# Discord Clone Backend

Rust backend using Axum framework with PostgreSQL.

## Setup

1. Install PostgreSQL:
```bash
# macOS
brew install postgresql
brew services start postgresql

# Create database
createdb discord_clone
```

2. Update `.env` with your database credentials:
```
DATABASE_URL=postgresql://postgres:password@localhost/discord_clone
```

3. Run the server:
```bash
cd backend
cargo run
```

The migrations will run automatically on startup.

## API Endpoints

- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/messages/:channel` - Get messages for channel
- POST `/api/messages/:channel` - Send message to channel
- GET `/api/guilds` - Get user's guilds
- POST `/api/guilds` - Create guild
- GET `/ws` - WebSocket connection
