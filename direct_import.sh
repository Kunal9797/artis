#!/bin/bash

echo "📥 Direct Import to Supabase"
echo "==========================="

# Get backup file
BACKUP_DIR=$(cat last_backup.txt)
BACKUP_FILE="$BACKUP_DIR/artis_complete.sql"

echo "Using backup: $BACKUP_FILE"
echo ""
echo "🚀 Starting import..."
echo "This will show progress as it runs..."
echo ""

# Direct import using Docker
docker run -it --rm \
    -v "$BACKUP_FILE:/backup.sql:ro" \
    postgres:16 \
    sh -c "PGPASSWORD='zufdeq-fafnu9-cerXav' psql 'host=db.igkjogpnyppwpfvwdvby.supabase.co port=5432 dbname=postgres user=postgres sslmode=require' -f /backup.sql"

echo ""
echo "✅ Import complete!"
echo ""
echo "Please check your Supabase Dashboard:"
echo "https://supabase.com/dashboard/project/igkjogpnyppwpfvwdvby/editor"