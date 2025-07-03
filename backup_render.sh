#!/bin/bash

echo "🚀 Starting Artis Laminates Database Backup"
echo "=========================================="

# Render Database URL
RENDER_DB="postgresql://artis_db_user:exAc3fAFiKj4cKGJ9tFQzGGc7XIQawbV@dpg-ctk44gtds78s73et5hcg-a.singapore-postgres.render.com/artis_db"

# Create backup directory
BACKUP_DIR="./database_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"

# Test connection first
echo -e "\n🔍 Testing connection to Render database..."
psql "$RENDER_DB" -c "SELECT version();" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to Render database"
    echo "Please check if you have psql installed: brew install postgresql"
    exit 1
fi

echo "✅ Connected successfully!"

# Get counts
echo -e "\n📊 Getting database statistics..."
psql "$RENDER_DB" -t -c "SELECT 'Products: ' || COUNT(*) FROM products;" 2>/dev/null || echo "Products table not found"
psql "$RENDER_DB" -t -c "SELECT 'Transactions: ' || COUNT(*) FROM transactions;" 2>/dev/null || echo "Transactions table not found"
psql "$RENDER_DB" -t -c "SELECT 'Users: ' || COUNT(*) FROM users;" 2>/dev/null || echo "Users table not found"
psql "$RENDER_DB" -t -c "SELECT 'Distributors: ' || COUNT(*) FROM distributors;" 2>/dev/null || echo "Distributors table not found"

# Create backup
echo -e "\n💾 Creating backup (this may take a minute)..."
pg_dump "$RENDER_DB" \
    --no-owner \
    --no-privileges \
    --no-acl \
    --clean \
    --if-exists \
    > "$BACKUP_DIR/artis_complete.sql"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully!"
    
    # Show file size
    ls -lh "$BACKUP_DIR/artis_complete.sql"
    
    # Save location for next script
    echo "$BACKUP_DIR" > last_backup.txt
    
    echo -e "\n✨ Ready for next step!"
    echo "Run: ./import_to_supabase.sh"
else
    echo "❌ Backup failed"
    exit 1
fi