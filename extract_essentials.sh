#!/bin/bash

echo "📤 Extracting essential SQL for Supabase"

BACKUP_DIR=$(cat last_backup.txt)
ORIGINAL="$BACKUP_DIR/artis_complete.sql"
OUTPUT="$BACKUP_DIR/supabase_import.sql"

# Extract only CREATE TABLE and ALTER TABLE statements
echo "-- Artis Laminates Database Schema" > "$OUTPUT"
echo "-- Generated for Supabase import" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Get all CREATE TABLE statements
echo "Extracting table definitions..."
awk '/^CREATE TABLE/,/;$/ { print }' "$ORIGINAL" >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "-- Constraints and Indexes" >> "$OUTPUT"

# Get all constraints
grep -E "^ALTER TABLE.*ADD CONSTRAINT" "$ORIGINAL" >> "$OUTPUT" || true

# Get indexes
grep -E "^CREATE.*INDEX" "$ORIGINAL" >> "$OUTPUT" || true

# Add sample insert for distributors to verify
echo "" >> "$OUTPUT"
echo "-- Sample data insert (distributors table had 57 records)" >> "$OUTPUT"
echo "-- You'll need to import the full data separately" >> "$OUTPUT"

echo -e "\n✅ Created: $OUTPUT"
echo "📋 File contains only schema (no data)"
echo ""
echo "This avoids the COPY command issue."
echo "After creating tables, we'll import data differently."

# Copy to clipboard
cat "$OUTPUT" | pbcopy
echo "✅ Copied schema to clipboard!"