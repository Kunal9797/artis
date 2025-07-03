#!/bin/bash

echo "🔍 Testing Supabase Import"
echo "========================="

# First, let's test if we can connect
echo "1️⃣ Testing connection to Supabase..."
docker run --rm postgres:16 \
    sh -c "PGPASSWORD='zufdeq-fafnu9-cerXav' psql 'host=db.igkjogpnyppwpfvwdvby.supabase.co port=5432 dbname=postgres user=postgres sslmode=require' -c 'SELECT version();'"

if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to Supabase"
    exit 1
fi

echo -e "\n✅ Connection successful!"

# Check what's in the backup file
BACKUP_DIR=$(cat last_backup.txt)
BACKUP_FILE="$BACKUP_DIR/artis_complete.sql"

echo -e "\n2️⃣ Checking backup file..."
echo "File size: $(ls -lh "$BACKUP_FILE" | awk '{print $5}')"
echo "First few lines:"
head -30 "$BACKUP_FILE"

echo -e "\n3️⃣ Looking for CREATE TABLE statements..."
grep -c "CREATE TABLE" "$BACKUP_FILE" || echo "No CREATE TABLE found"

echo -e "\n4️⃣ Looking for INSERT statements..."
grep -c "INSERT INTO" "$BACKUP_FILE" || echo "No INSERT found"

echo -e "\n5️⃣ Checking current tables in Supabase..."
docker run --rm postgres:16 \
    sh -c "PGPASSWORD='zufdeq-fafnu9-cerXav' psql 'host=db.igkjogpnyppwpfvwdvby.supabase.co port=5432 dbname=postgres user=postgres sslmode=require' -c '\dt';"