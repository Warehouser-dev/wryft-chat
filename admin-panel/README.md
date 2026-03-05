# Wryft Admin Panel

Modern admin dashboard for managing Wryft Chat platform.

## Features

- 📊 Dashboard with real-time statistics
- 👥 User management (ban, unban, delete)
- 🏰 Guild management (view, delete)
- 🔒 Secure admin authentication
- 📝 Full audit logging

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Make yourself an admin:**
   ```sql
   psql -U postgres -d wryft
   UPDATE users SET is_admin = TRUE, admin_level = 3 WHERE email = 'your@email.com';
   ```

4. **Start dev server:**
   ```bash
   npm run dev
   ```

5. **Access admin panel:**
   ```
   http://localhost:5174
   ```

## Admin Levels

- **Level 1**: Moderator - View stats and users
- **Level 2**: Admin - Ban users, delete guilds
- **Level 3**: Super Admin - Delete users, full access

## Production Build

```bash
npm run build
```

Output will be in `dist/` folder.

## Security

- All admin actions are logged in the database
- JWT authentication required
- Admin level checks on every action
- HTTPS required in production

## Tech Stack

- React 18
- Vite
- Vanilla CSS
