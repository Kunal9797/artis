#!/bin/bash

echo "🧹 Creating clean SQL file for Supabase..."

BACKUP_DIR=$(cat last_backup.txt)
ORIGINAL="$BACKUP_DIR/artis_complete.sql"
CLEANED="$BACKUP_DIR/artis_clean.sql"

# Remove COPY commands and convert to INSERT statements
echo "Converting COPY commands to INSERT statements..."

# First, copy everything except COPY sections
sed '/^COPY/,/^\\\.$/d' "$ORIGINAL" > "$CLEANED"

# Now extract and convert COPY data to INSERT statements
echo "" >> "$CLEANED"
echo "-- Converted INSERT statements" >> "$CLEANED"

# Extract distributors data
if grep -q "COPY public.distributors" "$ORIGINAL"; then
    echo -e "\nConverting distributors data..."
    awk '/COPY public.distributors/,/\\\\\./ {
        if (NR==1) {
            # Get column names
            match($0, /\((.*)\)/, cols)
            columns = cols[1]
            print "-- Distributors data"
            next
        }
        if ($0 == "\\\\.") next
        
        # Convert tab-separated values to INSERT
        gsub(/\t/, "'\''", "'\''")
        gsub(/\\N/, "NULL")
        print "INSERT INTO public.distributors (" columns ") VALUES ('\''" $0 "'\'');"
    }' "$ORIGINAL" | sed "s/'NULL'/NULL/g" >> "$CLEANED"
fi

echo -e "\n✅ Clean SQL file created: $CLEANED"
echo "📋 Copying to clipboard..."

cat "$CLEANED" | pbcopy

echo -e "\n✅ Copied to clipboard!"
echo "Now paste in Supabase SQL Editor and run."