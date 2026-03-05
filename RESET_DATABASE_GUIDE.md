# Database Reset Guide

## Overview
Scripts to clear data from your Wryft database for testing purposes.

## ⚠️ Important Warnings

- **These operations are IRREVERSIBLE**
- **Always backup your database before running reset scripts**
- **Only use in development/testing environments**
- **Never run in production**

## Reset Options

### 1. Full Reset (Everything)
Clears ALL data: users, guilds, messages, DMs, friendships, etc.

```bash
./reset_database.sh
```

Or manually:
```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -f backend/migrations/reset_data.sql
```

**What gets deleted:**
- ✅ All users
- ✅ All guilds
- ✅ All messages
- ✅ All DMs
- ✅ All friendships
- ✅ All reactions
- ✅ All voice sessions
- ✅ All presence data
- ✅ All user stats
- ✅ All earned badges

**What is preserved:**
- ✅ Badge definitions (48 badges)
- ✅ Database schema
- ✅ Migrations history

### 2. Clear Messages Only
Keeps users and guilds, only clears messages and DMs.

```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -f backend/migrations/clear_messages_only.sql
```

**What gets deleted:**
- ✅ All messages
- ✅ All DMs
- ✅ Message attachments
- ✅ Message reactions
- ✅ Typing indicators

**What is preserved:**
- ✅ Users
- ✅ Guilds
- ✅ Friendships
- ✅ Roles
- ✅ Channels

### 3. Clear Guilds Only
Keeps users and DMs, only clears guilds and guild-related data.

```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -f backend/migrations/clear_guilds_only.sql
```

**What gets deleted:**
- ✅ All guilds
- ✅ Guild messages
- ✅ Channels
- ✅ Roles
- ✅ Guild members
- ✅ Invites
- ✅ Custom emoji
- ✅ Audit logs

**What is preserved:**
- ✅ Users
- ✅ DMs
- ✅ Friendships

## Quick Commands

### Full Reset with Confirmation
```bash
./reset_database.sh
```

### Full Reset (No Confirmation)
```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft << EOF
\i backend/migrations/reset_data.sql
EOF
```

### Clear Everything Except Users
```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft << EOF
TRUNCATE TABLE guilds CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE direct_messages CASCADE;
TRUNCATE TABLE friendships CASCADE;
EOF
```

### Delete Specific User
```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -c "
DELETE FROM users WHERE email = 'user@example.com';
"
```

### Delete Specific Guild
```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -c "
DELETE FROM guilds WHERE name = 'Test Server';
"
```

## Backup Before Reset

### Create Backup
```bash
PGPASSWORD=wryft2024 pg_dump -h localhost -U postgres -d wryft > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup
```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft < backup_20240101_120000.sql
```

## After Reset

### 1. Restart Backend
```bash
cd backend
cargo run
```

### 2. Create Test User
```bash
# Use the registration endpoint
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. Grant Premium (Optional)
```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -c "
UPDATE users 
SET is_premium = true, 
    premium_since = NOW(), 
    premium_expires_at = NOW() + INTERVAL '1 year'
WHERE email = 'test@example.com';
"
```

### 4. Verify Reset
```bash
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -c "
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM guilds) as guilds,
  (SELECT COUNT(*) FROM messages) as messages,
  (SELECT COUNT(*) FROM direct_messages) as dms,
  (SELECT COUNT(*) FROM badges) as badges;
"
```

## Troubleshooting

### Permission Denied
```bash
# Make script executable
chmod +x reset_database.sh
```

### Connection Failed
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -c "SELECT 1;"
```

### Foreign Key Violations
The reset scripts use `CASCADE` to handle foreign keys automatically. If you still get errors:

```bash
# Disable foreign key checks temporarily
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft << EOF
SET session_replication_role = 'replica';
-- Your delete commands here
SET session_replication_role = 'origin';
EOF
```

## Safety Tips

1. **Always backup first** - Use `pg_dump` before any reset
2. **Test in development** - Never run in production
3. **Use specific resets** - Clear only what you need (messages vs full reset)
4. **Verify after reset** - Check counts to ensure expected state
5. **Document changes** - Keep notes of what you reset and why

## Common Use Cases

### Testing Registration Flow
```bash
# Clear all users
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -c "TRUNCATE TABLE users CASCADE;"
```

### Testing Guild Creation
```bash
# Clear guilds but keep users
./backend/migrations/clear_guilds_only.sql
```

### Testing Messaging
```bash
# Clear messages but keep everything else
./backend/migrations/clear_messages_only.sql
```

### Fresh Start
```bash
# Full reset
./reset_database.sh
```

## Alternative: Drop and Recreate Database

For a completely fresh database (including schema):

```bash
# Drop database
PGPASSWORD=wryft2024 psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS wryft;"

# Create database
PGPASSWORD=wryft2024 psql -h localhost -U postgres -c "CREATE DATABASE wryft;"

# Run all migrations
cd backend
for f in migrations/*.sql; do
  echo "Running $f..."
  PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -f "$f"
done
```

## Quick Reference

| Command | What it does | Preserves |
|---------|-------------|-----------|
| `./reset_database.sh` | Full reset | Schema, badges |
| `clear_messages_only.sql` | Clear messages | Users, guilds |
| `clear_guilds_only.sql` | Clear guilds | Users, DMs |
| `TRUNCATE users CASCADE` | Clear users | Schema only |
| `DROP DATABASE` | Delete everything | Nothing |
