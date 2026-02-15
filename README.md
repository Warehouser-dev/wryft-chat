# Wryft - Discord Alternative built for fun!

A privacy-focused chat platform built with React and Rust.

<img width="1920" height="907" alt="Screenshot 2026-02-15 at 13 27 14" src="https://github.com/user-attachments/assets/f1bfb022-2034-426b-8eaa-7587f0811483" />

## Features

- Real-time messaging with WebSockets
- Server/Guild system with channels
- User profiles and member management
- Server invites
- No ID verification required
- Freedom of speech focus

## Tech Stack

**Frontend:**
- React + Vite
- React Router
- Lucide React icons

**Backend:** 

- Rust + Axum
- PostgreSQL
- WebSockets
- JWT authentication

## Setup

### Backend

```bash
cd backend
cargo run
```

### Frontend

```bash
npm install
npm run dev
```

### Database

Create PostgreSQL database:
```bash
createdb wryft
psql -d wryft -f backend/migrations/001_init.sql
```

## Environment Variables

Create `backend/.env`:
```
JWT_SECRET=your-secret-key
PORT=3001
DATABASE_URL=postgresql://username@localhost/wryft
```

## License

MIT
# wryft-chat
