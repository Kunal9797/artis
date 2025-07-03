#!/bin/bash

# Artis Laminates - Production Migration Script
# Run this after adding Render Database URL to credentials file

set -e  # Exit on error

echo "🚀 Starting Artis Laminates Migration to Supabase"
echo "================================================"

# Load credentials
source ./supabase_credentials.txt

# Check if Render URL is set
if [ -z "$RENDER_DATABASE_URL" ] || [[ "$RENDER_DATABASE_URL" == *"[user]"* ]]; then
    echo "❌ Error: Please add your Render Database URL to supabase_credentials.txt first!"
    echo "   Look for: RENDER_DATABASE_URL=..."
    exit 1
fi

# Create backup directory
BACKUP_DIR="./database_backups/migration_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "✅ Created backup directory: $BACKUP_DIR"

# Step 1: Test Render connection
echo -e "\n📡 Testing Render database connection..."
psql "$RENDER_DATABASE_URL" -c "SELECT COUNT(*) as products FROM products;" > "$BACKUP_DIR/counts.txt" 2>&1 || {
    echo "❌ Cannot connect to Render database. Please check the URL."
    exit 1
}
echo "✅ Successfully connected to Render database"

# Step 2: Export database
echo -e "\n💾 Exporting production database (this may take a few minutes)..."
pg_dump "$RENDER_DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --no-acl \
    --clean \
    --if-exists \
    > "$BACKUP_DIR/artis_production_backup.sql"

echo "✅ Database exported successfully"

# Step 3: Create separate files for safety
echo -e "\n📁 Creating separate schema and data files..."
pg_dump "$RENDER_DATABASE_URL" \
    --schema-only \
    --no-owner \
    --no-privileges \
    > "$BACKUP_DIR/schema_only.sql"

pg_dump "$RENDER_DATABASE_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    > "$BACKUP_DIR/data_only.sql"

# Step 4: Show backup info
echo -e "\n📊 Backup Summary:"
ls -lh "$BACKUP_DIR/"
echo -e "\n📈 Database Statistics:"
cat "$BACKUP_DIR/counts.txt"

echo -e "\n✅ Backup complete! Next steps:"
echo "1. Review the backup files in: $BACKUP_DIR"
echo "2. Run: ./import_to_supabase.sh"
echo "3. The import script will use these backups"

# Save backup location for import script
echo "$BACKUP_DIR" > last_backup_location.txt