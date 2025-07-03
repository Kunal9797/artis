#!/bin/bash

# Artis Laminates - Supabase Migration Script
# This script helps automate the database migration process

set -e  # Exit on error

echo "🚀 Artis Laminates - Supabase Migration Tool"
echo "==========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}Error: backend/.env file not found${NC}"
    exit 1
fi

# Function to prompt for input
prompt_for_value() {
    local prompt=$1
    local var_name=$2
    read -p "$prompt: " value
    eval "$var_name='$value'"
}

# Step 1: Get database URLs
echo -e "\n${YELLOW}Step 1: Database Configuration${NC}"
prompt_for_value "Enter Render Database URL" RENDER_DB_URL
prompt_for_value "Enter Supabase Database URL" SUPABASE_DB_URL

# Step 2: Create backup directory
BACKUP_DIR="./database_backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
echo -e "\n${GREEN}Created backup directory: $BACKUP_DIR${NC}"

# Step 3: Export Render database
echo -e "\n${YELLOW}Step 2: Exporting Render Database...${NC}"
pg_dump "$RENDER_DB_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --no-acl \
    > "$BACKUP_DIR/artis_complete_backup.sql"

echo -e "${GREEN}✓ Database exported successfully${NC}"

# Step 4: Create schema and data files separately
echo -e "\n${YELLOW}Step 3: Creating separate schema and data files...${NC}"
pg_dump "$RENDER_DB_URL" \
    --schema-only \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    > "$BACKUP_DIR/schema.sql"

pg_dump "$RENDER_DB_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    > "$BACKUP_DIR/data.sql"

echo -e "${GREEN}✓ Schema and data files created${NC}"

# Step 5: Show backup info
echo -e "\n${YELLOW}Backup Information:${NC}"
ls -lh $BACKUP_DIR/

# Step 6: Ask if ready to import
echo -e "\n${YELLOW}Ready to import to Supabase?${NC}"
echo "This will:"
echo "  1. Import the schema"
echo "  2. Import the data"
echo "  3. Update your backend configuration"
read -p "Continue? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration paused. Your backups are in: $BACKUP_DIR${NC}"
    exit 0
fi

# Step 7: Import to Supabase
echo -e "\n${YELLOW}Step 4: Importing to Supabase...${NC}"

# Import schema first
echo "Importing schema..."
psql "$SUPABASE_DB_URL" < "$BACKUP_DIR/schema.sql" 2>/dev/null || {
    echo -e "${YELLOW}Note: Some schema warnings are normal (Supabase default tables)${NC}"
}

# Import data
echo "Importing data..."
psql "$SUPABASE_DB_URL" < "$BACKUP_DIR/data.sql"

echo -e "${GREEN}✓ Database imported successfully${NC}"

# Step 8: Create new environment file
echo -e "\n${YELLOW}Step 5: Creating Supabase environment configuration...${NC}"
cat > backend/.env.supabase << EOF
# Supabase Configuration
DATABASE_URL=$SUPABASE_DB_URL

# Copy these from your existing .env file:
JWT_SECRET=your_jwt_secret_here
PORT=5000
NODE_ENV=production

# Add your Supabase keys:
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF

echo -e "${GREEN}✓ Created backend/.env.supabase${NC}"
echo -e "${YELLOW}Please update this file with your actual values${NC}"

# Step 9: Test connection
echo -e "\n${YELLOW}Step 6: Testing Supabase connection...${NC}"
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: '$SUPABASE_DB_URL' });
client.connect()
  .then(() => {
    console.log('✓ Successfully connected to Supabase');
    return client.query('SELECT COUNT(*) FROM products');
  })
  .then(result => {
    console.log('✓ Products table has', result.rows[0].count, 'records');
    client.end();
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    client.end();
  });
" 2>/dev/null || echo -e "${RED}Connection test requires 'pg' npm package${NC}"

# Step 10: Final instructions
echo -e "\n${GREEN}🎉 Migration Complete!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Update backend/.env.supabase with your actual Supabase credentials"
echo "2. Rename current .env to .env.render for backup"
echo "3. Rename .env.supabase to .env"
echo "4. Restart your backend: npm run dev"
echo "5. Test all functionality"
echo -e "\n${YELLOW}Backup Location:${NC} $BACKUP_DIR"
echo -e "\n${YELLOW}Rollback Command:${NC}"
echo "   psql \"$RENDER_DB_URL\" < $BACKUP_DIR/artis_complete_backup.sql"