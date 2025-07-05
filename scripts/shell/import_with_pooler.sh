#!/bin/bash

echo "📥 Import to Supabase via Transaction Pooler"
echo "==========================================="

# Use the transaction pooler URL with your password
SUPABASE_URL="postgresql://postgres.igkjogpnyppwpfvwdvby:zufdeq-fafnu9-cerXav@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Get backup
BACKUP_DIR=$(cat last_backup.txt)
BACKUP_FILE="$BACKUP_DIR/artis_complete.sql"

echo "📁 Using backup: $BACKUP_FILE"
echo "🔗 Using IPv4 transaction pooler"

# Test connection first
echo -e "\n🔍 Testing connection..."
PGPASSWORD='zufdeq-fafnu9-cerXav' psql "$SUPABASE_URL" -c "SELECT version();" 

if [ $? -eq 0 ]; then
    echo "✅ Connection successful!"
    
    # Import the backup
    echo -e "\n🚀 Starting import (this may take a few minutes)..."
    PGPASSWORD='zufdeq-fafnu9-cerXav' psql "$SUPABASE_URL" -f "$BACKUP_FILE" -v ON_ERROR_STOP=1 2>&1 | tee import_log.txt
    
    # Check results
    echo -e "\n📊 Checking import results..."
    PGPASSWORD='zufdeq-fafnu9-cerXav' psql "$SUPABASE_URL" -c "
    SELECT 'Tables created: ' || COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
    "
    
    # Try to get specific counts
    echo -e "\n📈 Checking data..."
    PGPASSWORD='zufdeq-fafnu9-cerXav' psql "$SUPABASE_URL" -c "SELECT 'Distributors: ' || COUNT(*) FROM distributors;" 2>/dev/null || echo "Checking distributors..."
    
    echo -e "\n✅ Import process completed!"
    echo "Check your Supabase dashboard: https://supabase.com/dashboard/project/igkjogpnyppwpfvwdvby/editor"
else
    echo "❌ Still cannot connect. Please check:"
    echo "1. Is your Supabase project running?"
    echo "2. Try the manual SQL Editor method"
fi