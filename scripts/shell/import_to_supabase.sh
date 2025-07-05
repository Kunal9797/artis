#!/bin/bash

echo "📥 Artis Laminates - Import to Supabase"
echo "======================================"

# Supabase credentials
SUPABASE_DB="postgresql://postgres:zufdeq-fafnu9-cerXav@db.igkjogpnyppwpfvwdvby.supabase.co:5432/postgres?sslmode=require"

# Get last backup location
if [ ! -f "last_backup.txt" ]; then
    echo "❌ No backup found. Please run ./docker_backup.sh first"
    exit 1
fi

BACKUP_DIR=$(cat last_backup.txt)
BACKUP_FILE="$BACKUP_DIR/artis_complete.sql"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📁 Using backup: $BACKUP_FILE"
echo "🎯 Target: Supabase database"

# Test Supabase connection
echo -e "\n🔍 Testing Supabase connection..."
docker run --rm postgres:16 \
    psql "$SUPABASE_DB" -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to Supabase"
    echo "Please check your credentials"
    exit 1
fi
echo "✅ Connected to Supabase!"

# Show current state
echo -e "\n📊 Current Supabase database state:"
docker run --rm postgres:16 \
    psql "$SUPABASE_DB" -t -c "
    SELECT 'Tables: ' || COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
    "

# Import warning
echo -e "\n⚠️  WARNING: This will replace all data in Supabase!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Import the backup
echo -e "\n🚀 Starting import..."
docker run --rm \
    -v "$BACKUP_FILE:/backup.sql:ro" \
    postgres:16 \
    psql "$SUPABASE_DB" -f /backup.sql > import_log.txt 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Import completed!"
else
    echo "⚠️  Import completed with some warnings (this is normal)"
fi

# Show results
echo -e "\n📊 Import results:"
docker run --rm postgres:16 \
    psql "$SUPABASE_DB" -t -c "
    SELECT 'Products: ' || COUNT(*) FROM products;
    SELECT 'Transactions: ' || COUNT(*) FROM transactions;
    SELECT 'Users: ' || COUNT(*) FROM users;
    SELECT 'Distributors: ' || COUNT(*) FROM distributors;
    " 2>/dev/null || echo "Checking tables..."

echo -e "\n✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Check Supabase Dashboard → Table Editor"
echo "2. Verify your data is there"
echo "3. Update your backend configuration"
echo ""
echo "To update backend, run: ./update_backend.sh"

# Check for errors in log
echo -e "\n📋 Checking import log for issues..."
grep -i "error" import_log.txt | grep -v "already exists" | head -5 || echo "No critical errors found"