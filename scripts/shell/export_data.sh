#!/bin/bash

echo "🚀 Alternative Export Method for Artis Laminates"
echo "=============================================="

RENDER_DB="postgresql://artis_db_user:exAc3fAFiKj4cKGJ9tFQzGGc7XIQawbV@dpg-ctk44gtds78s73et5hcg-a.singapore-postgres.render.com/artis_db"
BACKUP_DIR="./database_backups/export_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Export directory: $BACKUP_DIR"

# First, let's see what tables exist
echo -e "\n📋 Listing all tables..."
psql "$RENDER_DB" -t -c "\dt" > "$BACKUP_DIR/tables_list.txt"
cat "$BACKUP_DIR/tables_list.txt"

# Export schema using psql
echo -e "\n📐 Exporting schema..."
psql "$RENDER_DB" -t -c "
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || schemaname || '.' || tablename || ' (' || chr(10) ||
    array_to_string(
        array_agg(
            '    ' || column_name || ' ' || data_type || 
            CASE 
                WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')' 
                ELSE '' 
            END ||
            CASE 
                WHEN is_nullable = 'NO' 
                THEN ' NOT NULL' 
                ELSE '' 
            END
        ), 
        ',' || chr(10)
    ) || chr(10) || ');'
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
GROUP BY 
    schemaname, tablename, table_schema
ORDER BY 
    tablename;" > "$BACKUP_DIR/schema.sql"

# Export data as CSV for each table
echo -e "\n💾 Exporting data as CSV..."

# Get list of tables
TABLES=$(psql "$RENDER_DB" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public';")

for table in $TABLES; do
    if [ ! -z "$table" ]; then
        echo "  Exporting $table..."
        psql "$RENDER_DB" -c "\COPY $table TO '$BACKUP_DIR/${table}.csv' WITH CSV HEADER;" 2>/dev/null || {
            # If COPY fails, try alternative method
            psql "$RENDER_DB" -t -A -F"," -c "SELECT * FROM $table" > "$BACKUP_DIR/${table}.csv" 2>/dev/null
        }
    fi
done

# Create a simple SQL export using psql
echo -e "\n📄 Creating SQL export..."
for table in $TABLES; do
    if [ ! -z "$table" ]; then
        echo "-- Data for $table" >> "$BACKUP_DIR/data.sql"
        psql "$RENDER_DB" -t -c "
        SELECT 'INSERT INTO $table VALUES (' || 
        string_agg(
            CASE 
                WHEN t::text IS NULL THEN 'NULL'
                WHEN t::text ~ '^[0-9]+\.?[0-9]*$' THEN t::text
                ELSE '''' || replace(t::text, '''', '''''') || ''''
            END, ', '
        ) || ');'
        FROM $table t;" >> "$BACKUP_DIR/data.sql" 2>/dev/null
    fi
done

echo -e "\n📊 Export Summary:"
ls -la "$BACKUP_DIR/"

echo -e "\n✅ Export complete!"
echo "Files created in: $BACKUP_DIR"
echo ""
echo "Note: Due to version mismatch, we exported data as CSV files."
echo "We'll import these to Supabase in the next step."

# Save location
echo "$BACKUP_DIR" > last_export.txt