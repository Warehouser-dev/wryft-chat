#!/bin/bash

# Wryft Chat - Production Deployment Script

set -e

echo "🚀 Starting Wryft Chat deployment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production from .env.production.example"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed!"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("JWT_SECRET" "DB_PASSWORD" "VITE_API_URL" "VITE_WS_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env.production"
        exit 1
    fi
done

# Check JWT_SECRET length
if [ ${#JWT_SECRET} -lt 32 ]; then
    echo "❌ Error: JWT_SECRET must be at least 32 characters long"
    exit 1
fi

echo "✅ Environment variables validated"

# Pull latest changes (if in git repo)
if [ -d .git ]; then
    echo "📥 Pulling latest changes..."
    git pull
fi

# Build and start containers
echo "🏗️  Building Docker images..."
docker-compose --env-file .env.production build

echo "🚀 Starting services..."
docker-compose --env-file .env.production up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check backend health
echo "🔍 Checking backend health..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3001/api/health &> /dev/null; then
        echo "✅ Backend is healthy!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting for backend... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend health check failed!"
    docker-compose --env-file .env.production logs backend
    exit 1
fi

# Check frontend health
echo "🔍 Checking frontend health..."
if curl -f http://localhost/health &> /dev/null; then
    echo "✅ Frontend is healthy!"
else
    echo "⚠️  Frontend health check failed, but continuing..."
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
docker-compose --env-file .env.production ps
echo ""
echo "📝 View logs with: docker-compose --env-file .env.production logs -f"
echo "🛑 Stop services with: docker-compose --env-file .env.production down"
echo ""
