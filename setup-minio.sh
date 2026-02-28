#!/bin/bash

echo "🚀 Setting up MinIO for Wryft..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Start MinIO (try both docker-compose and docker compose)
echo "Starting MinIO..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d minio
elif docker compose version &> /dev/null 2>&1; then
    docker compose up -d minio
else
    echo "Running MinIO directly with docker run..."
    docker run -d \
        --name wryft-minio \
        -p 9000:9000 \
        -p 9001:9001 \
        -e "MINIO_ROOT_USER=minioadmin" \
        -e "MINIO_ROOT_PASSWORD=minioadmin" \
        -v ~/wryft-minio-data:/data \
        quay.io/minio/minio:latest \
        server /data --console-address ":9001"
fi

# Wait for MinIO to be ready
echo "Waiting for MinIO to start..."
sleep 10

# Check if MinIO is running
if ! curl -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "❌ MinIO failed to start. Check Docker logs:"
    echo "   docker logs wryft-minio"
    exit 1
fi

echo "✅ MinIO is running!"

# Install mc (MinIO Client) if not installed
if ! command -v mc &> /dev/null; then
    echo "Installing MinIO Client..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minio/stable/mc
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget https://dl.min.io/client/mc/release/linux-amd64/mc
        chmod +x mc
        sudo mv mc /usr/local/bin/
    fi
fi

# Configure mc
echo "Configuring MinIO Client..."
mc alias set local http://localhost:9000 minioadmin minioadmin

# Create bucket
echo "Creating 'wryft' bucket..."
mc mb local/wryft --ignore-existing

# Set public policy for the bucket
echo "Setting public read policy..."
mc anonymous set download local/wryft

echo ""
echo "✅ MinIO setup complete!"
echo ""
echo "📦 MinIO Console: http://localhost:9001"
echo "   Username: minioadmin"
echo "   Password: minioadmin"
echo ""
echo "🔗 S3 Endpoint: http://localhost:9000"
echo "📁 Bucket: wryft"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env if you haven't"
echo "2. Make sure S3_* variables are set in .env"
echo "3. Run 'cargo run' in the backend directory"
