#!/bin/bash

# Wryft Chat - Database Backup Script

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/wryft_backup_$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🗄️  Starting database backup..."

# Backup database
docker exec wryft-postgres pg_dump -U wryft wryft > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "✅ Backup completed: ${BACKUP_FILE}.gz"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "wryft_backup_*.sql.gz" -mtime +7 -delete

echo "🧹 Old backups cleaned up (kept last 7 days)"
