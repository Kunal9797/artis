#!/bin/bash

echo "🔨 Creating complete schema with proper order"

BACKUP_DIR=$(cat last_backup.txt)
ORIGINAL="$BACKUP_DIR/artis_complete.sql"
OUTPUT="$BACKUP_DIR/complete_schema.sql"

# Start fresh
echo "-- Artis Laminates Complete Schema" > "$OUTPUT"
echo "-- Created: $(date)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Step 1: Extract ENUM type definitions
echo "-- Step 1: Create ENUM types" >> "$OUTPUT"
echo "Extracting ENUM types..."

# Find and extract CREATE TYPE statements
awk '/^CREATE TYPE.*AS ENUM/,/\);$/ { print }' "$ORIGINAL" >> "$OUTPUT" 2>/dev/null || {
    # If no CREATE TYPE found, look for the types in comments and create them
    echo "CREATE TYPE public.enum_Attendance_status AS ENUM ('PRESENT', 'ABSENT', 'HOLIDAY', 'LEAVE');" >> "$OUTPUT"
    echo "CREATE TYPE public.enum_Attendances_status AS ENUM ('PRESENT', 'ABSENT', 'HOLIDAY', 'LEAVE');" >> "$OUTPUT"
    echo "CREATE TYPE public.enum_Leads_status AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');" >> "$OUTPUT"
    echo "CREATE TYPE public.enum_SalesTeams_role AS ENUM ('SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD');" >> "$OUTPUT"
    echo "CREATE TYPE public.enum_Transactions_type AS ENUM ('IN', 'OUT');" >> "$OUTPUT"
    echo "CREATE TYPE public.enum_Users_role AS ENUM ('admin', 'user');" >> "$OUTPUT"
}

echo "" >> "$OUTPUT"
echo "-- Step 2: Create sequences" >> "$OUTPUT"
grep "CREATE SEQUENCE" "$ORIGINAL" >> "$OUTPUT" 2>/dev/null || true

echo "" >> "$OUTPUT"
echo "-- Step 3: Create tables" >> "$OUTPUT"
# Extract tables but skip the enum definitions
awk '/^CREATE TABLE/,/\);$/ { print }' "$ORIGINAL" >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "-- Step 4: Create indexes" >> "$OUTPUT"
grep "CREATE.*INDEX" "$ORIGINAL" >> "$OUTPUT" 2>/dev/null || true

echo "" >> "$OUTPUT"
echo "-- Step 5: Add constraints" >> "$OUTPUT"
grep "ALTER TABLE.*ADD CONSTRAINT" "$ORIGINAL" >> "$OUTPUT" 2>/dev/null || true

# Show summary
echo -e "\n✅ Complete schema created"
echo "📋 Includes:"
echo "  - ENUM types"
echo "  - Tables" 
echo "  - Indexes"
echo "  - Constraints"

# Copy to clipboard
cat "$OUTPUT" | pbcopy
echo -e "\n✅ Copied to clipboard!"
echo "Paste in SQL Editor and run."