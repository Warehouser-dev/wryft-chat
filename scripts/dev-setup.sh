#!/bin/bash

# Wryft Chat - Development Setup Script

set -e

echo "🚀 Setting up Wryft Chat for development..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first."
    echo "Visit: https://rustup.rs/"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

echo "✅ All prerequisites installed"

# Create environment files if they don't exist
if [ ! -f wryft-web/.env ]; then
    echo "📝 Creating frontend .env file..."
    cp wryft-web/.env.example wryft-web/.env
    echo "✅ Created wryft-web/.env"
fi

if [ ! -f backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
    echo "⚠️  Please update backend/.env with your database credentials"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd wryft-web
npm install
cd ..

# Check if database exists
DB_NAME="wryft"
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "✅ Database '$DB_NAME' already exists"
else
    echo "🗄️  Creating database '$DB_NAME'..."
    createdb $DB_NAME
    echo "✅ Database created"
fi

# Run migrations
echo "🔄 Running database migrations..."
for migration in backend/migrations/*.sql; do
    echo "Running $(basename $migration)..."
    psql -d $DB_NAME -f "$migration" -q
done
echo "✅ Migrations completed"

# Build backend (to check for errors)
echo "🔨 Building backend..."
cd backend
cargo build
cd ..
echo "✅ Backend built successfully"

echo ""
echo "✅ Development setup complete!"
echo ""
echo "🎯 Next steps:"
echo ""
echo "1. Update backend/.env with your database credentials if needed"
echo "2. Start the backend:"
echo "   cd backend && cargo run"
echo ""
echo "3. In a new terminal, start the frontend:"
echo "   cd wryft-web && npm run dev"
echo ""
echo "4. Open your browser to http://localhost:5173"
echo ""
echo "📚 For more information, see README.md"
