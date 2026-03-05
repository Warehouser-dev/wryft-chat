#!/bin/bash

# Database Reset Script
# This script will clear all user data from the database

echo "⚠️  WARNING: This will delete ALL users, guilds, messages, and related data!"
echo "This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Reset cancelled."
    exit 0
fi

echo ""
echo "🔄 Resetting database..."
echo ""

# Load environment variables
if [ -f backend/.env ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

# Run the reset script
PGPASSWORD=wryft2024 psql -h localhost -U postgres -d wryft -f backend/migrations/reset_data.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database reset complete!"
    echo ""
    echo "📊 Summary:"
    echo "   - All users deleted"
    echo "   - All guilds deleted"
    echo "   - All messages deleted"
    echo "   - All DMs deleted"
    echo "   - All friendships deleted"
    echo "   - All badges preserved (ready for new users)"
    echo ""
    echo "🚀 You can now create fresh users and start testing!"
else
    echo ""
    echo "❌ Database reset failed. Check the error messages above."
    exit 1
fi
