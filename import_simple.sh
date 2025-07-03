#!/bin/bash

echo "📥 Importing to Supabase (Simplified)"
echo "===================================="

# Files
BACKUP_DIR=$(cat last_backup.txt)
BACKUP_FILE="$BACKUP_DIR/artis_complete.sql"

echo "📁 Backup file: $BACKUP_FILE"

# Import using Docker with all flags
echo -e "\n🚀 Starting import (this may take a few minutes)..."
docker run --rm \
    -v "$BACKUP_FILE:/backup.sql:ro" \
    --add-host=db.igkjogpnyppwpfvwdvby.supabase.co:$(dig +short db.igkjogpnyppwpfvwdvby.supabase.co | head -1) \
    postgres:16 \
    bash -c "PGPASSWORD=zufdeq-fafnu9-cerXav psql -h db.igkjogpnyppwpfvwdvby.supabase.co -U postgres -d postgres -f /backup.sql" \
    > import_results.txt 2>&1

echo "✅ Import command executed"

# Check results
echo -e "\n📊 Checking results..."
grep -i "create table" import_results.txt | wc -l | xargs echo "Tables created:"
grep -i "insert" import_results.txt | wc -l | xargs echo "Insert operations:"

echo -e "\n📋 Any errors?"
grep -i "error" import_results.txt | grep -v "already exists" | head -5 || echo "No critical errors"

echo -e "\n✅ Done! Check your Supabase Dashboard:"
echo "https://supabase.com/dashboard/project/igkjogpnyppwpfvwdvby/editor"
echo ""
echo "Look for:"
echo "- distributors table (should have 57 records)"
echo "- Other tables from your application"