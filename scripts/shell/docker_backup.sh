#!/bin/bash

echo "🐳 Artis Laminates - Docker Backup Method"
echo "========================================"

# Database credentials
RENDER_DB_URL="postgresql://artis_db_user:exAc3fAFiKj4cKGJ9tFQzGGc7XIQawbV@dpg-ctk44gtds78s73et5hcg-a.singapore-postgres.render.com/artis_db"

# Create backup directory
BACKUP_DIR="$(pwd)/database_backups/docker_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"

# Check if Docker is running
docker info > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi
echo "✅ Docker is running"

# Run pg_dump using Docker with PostgreSQL 16
echo -e "\n💾 Starting backup using Docker PostgreSQL 16..."
docker run --rm \
    -v "$BACKUP_DIR:/backup" \
    postgres:16 \
    pg_dump "$RENDER_DB_URL" \
    --no-owner \
    --no-privileges \
    --no-acl \
    --clean \
    --if-exists \
    > "$BACKUP_DIR/artis_complete.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully!"
    
    # Show file info
    echo -e "\n📊 Backup file info:"
    ls -lh "$BACKUP_DIR/artis_complete.sql"
    
    # Quick validation
    echo -e "\n🔍 Validating backup..."
    head -20 "$BACKUP_DIR/artis_complete.sql" | grep -E "(PostgreSQL|CREATE|DROP)" > /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Backup file looks valid"
    else
        echo "⚠️  Backup file might be empty or invalid"
    fi
    
    # Save backup location
    echo "$BACKUP_DIR" > last_backup.txt
    
    echo -e "\n✨ Success! Ready for import to Supabase"
    echo "Next step: Run ./import_to_supabase.sh"
else
    echo "❌ Backup failed"
    echo "Please check your Docker installation and try again"
fi