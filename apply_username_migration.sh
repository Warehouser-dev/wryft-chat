#!/bin/bash

# Script to apply @username migration to all backend files
# This removes discriminator references throughout the codebase

echo "🔄 Applying @username migration to backend..."

# Update friends.rs - Remove discriminator from friend requests
sed -i '' 's/pub discriminator: String,//g' backend/src/handlers/friends.rs
sed -i '' 's/, discriminator//g' backend/src/handlers/friends.rs
sed -i '' 's/discriminator,//g' backend/src/handlers/friends.rs
sed -i '' 's/u\.discriminator//g' backend/src/handlers/friends.rs

# Update users.rs - Remove discriminator fields and functions
sed -i '' 's/pub discriminator: String,//g' backend/src/handlers/users.rs
sed -i '' 's/, discriminator//g' backend/src/handlers/users.rs
sed -i '' 's/discriminator,//g' backend/src/handlers/users.rs
sed -i '' 's/u\.discriminator//g' backend/src/handlers/users.rs
sed -i '' 's/f\.discriminator//g' backend/src/handlers/users.rs

# Update dms.rs - Remove discriminator
sed -i '' 's/pub discriminator: String,//g' backend/src/handlers/dms.rs
sed -i '' 's/, discriminator//g' backend/src/handlers/dms.rs
sed -i '' 's/discriminator,//g' backend/src/handlers/dms.rs

# Update messages.rs - Remove author_discriminator
sed -i '' 's/author_discriminator,//g' backend/src/handlers/messages.rs
sed -i '' 's/, author_discriminator//g' backend/src/handlers/messages.rs
sed -i '' 's/payload\.author_discriminator//g' backend/src/handlers/messages.rs

# Update guilds.rs - Remove discriminator from member lists
sed -i '' 's/, discriminator//g' backend/src/handlers/guilds.rs
sed -i '' 's/discriminator,//g' backend/src/handlers/guilds.rs
sed -i '' 's/m\.discriminator//g' backend/src/handlers/guilds.rs

echo "✅ Backend migration complete!"
echo "⚠️  Note: You may need to manually fix some SQL queries"
echo "🔨 Next: Rebuild backend with 'cd backend && cargo build'"
