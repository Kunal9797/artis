#!/bin/bash

echo "🚀 Artis Laminates - Simple Backup Method"
echo "========================================"

RENDER_DB="postgresql://artis_db_user:exAc3fAFiKj4cKGJ9tFQzGGc7XIQawbV@dpg-ctk44gtds78s73et5hcg-a.singapore-postgres.render.com/artis_db"

# Test connection
echo "🔍 Testing connection..."
psql "$RENDER_DB" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to database"
    exit 1
fi
echo "✅ Connected!"

# Create backup folder
BACKUP_DIR="./db_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Try using pg_dump with version ignore flag
echo -e "\n💾 Attempting backup with version ignore..."
pg_dump "$RENDER_DB" \
    --no-owner \
    --no-privileges \
    --no-acl \
    --clean \
    --if-exists \
    --no-comments \
    --no-publications \
    --no-subscriptions \
    --no-tablespaces \
    --no-unlogged-table-data \
    --no-security-labels \
    --ignore-version \
    > "$BACKUP_DIR/backup.sql" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Backup successful!"
    ls -lh "$BACKUP_DIR/backup.sql"
    echo "$BACKUP_DIR" > last_backup.txt
    echo -e "\n✨ Ready for import! Next: ./import_to_supabase.sh"
else
    echo "⚠️  pg_dump failed due to version mismatch"
    echo ""
    echo "🔧 Solution: Update PostgreSQL to version 16"
    echo "Run: brew upgrade postgresql@16"
    echo "Or: brew install postgresql@16"
    echo ""
    echo "Alternative: Use Render's backup feature"
    echo "1. Go to Render Dashboard"
    echo "2. Click on your database" 
    echo "3. Go to 'Backups' tab"
    echo "4. Download a backup"
fi