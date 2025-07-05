#!/bin/bash

echo "📥 Import to Supabase - Fixed Version"
echo "===================================="

# Disable GSSAPI
export PGGSSENCMODE="disable"

# Connection URL
SUPABASE_URL="postgresql://postgres.igkjogpnyppwpfvwdvby:zufdeq-fafnu9-cerXav@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Get backup
BACKUP_DIR=$(cat last_backup.txt)
BACKUP_FILE="$BACKUP_DIR/artis_complete.sql"

echo "📁 Backup: $BACKUP_FILE"

# Test with explicit parameters
echo -e "\n🔍 Testing connection..."
psql -h aws-0-ap-southeast-1.pooler.supabase.com \
     -p 6543 \
     -U postgres.igkjogpnyppwpfvwdvby \
     -d postgres \
     -c "SELECT 1;" \
     --set=sslmode=require \
     2>&1

if [ $? -eq 0 ]; then
    echo "✅ Connected!"
    
    # Import
    echo -e "\n🚀 Importing..."
    psql -h aws-0-ap-southeast-1.pooler.supabase.com \
         -p 6543 \
         -U postgres.igkjogpnyppwpfvwdvby \
         -d postgres \
         -f "$BACKUP_FILE" \
         --set=sslmode=require \
         -v ON_ERROR_STOP=1
else
    echo -e "\n❌ Connection failed"
    echo ""
    echo "🔧 Manual import instructions:"
    echo "1. Open: https://supabase.com/dashboard/project/igkjogpnyppwpfvwdvby/sql/new"
    echo "2. Copy contents of backup file:"
    echo "   cat $BACKUP_FILE | pbcopy"
    echo "3. Paste in SQL Editor and click Run"
fi