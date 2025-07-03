#!/bin/bash

echo "📥 Final Import Attempt - Using Pooled Connection"
echo "==============================================="

# Use the pooled connection URL which might work better
POOLED_URL="postgresql://postgres.igkjogpnyppwpfvwdvby:zufdeq-fafnu9-cerXav@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# Get backup
BACKUP_DIR=$(cat last_backup.txt)
BACKUP_FILE="$BACKUP_DIR/artis_complete.sql"

echo "📁 Backup file: $BACKUP_FILE"
echo "🔗 Using pooled connection"

# Test connection with pooled URL
echo -e "\n🔍 Testing pooled connection..."
PGPASSWORD='zufdeq-fafnu9-cerXav' psql "$POOLED_URL" -c "SELECT 1;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Pooled connection works!"
    
    # Import using pooled connection
    echo -e "\n🚀 Importing database..."
    PGPASSWORD='zufdeq-fafnu9-cerXav' psql "$POOLED_URL" -f "$BACKUP_FILE" 2>&1 | tee import_output.log
    
    echo -e "\n✅ Import completed!"
else
    echo "❌ Cannot connect via pooled connection either"
    echo ""
    echo "Alternative approach:"
    echo "1. Go to Supabase Dashboard"
    echo "2. Click 'SQL Editor' in the sidebar"
    echo "3. Click 'New Query'"
    echo "4. Copy and paste the contents of:"
    echo "   $BACKUP_FILE"
    echo "5. Click 'Run'"
fi