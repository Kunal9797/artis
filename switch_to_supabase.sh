#!/bin/bash

# Switch script to use Supabase database

echo "🔄 Switching to Supabase database..."
echo ""

# Backend switch
echo "📦 Backend Configuration:"
cd backend

# Backup current .env
if [ -f .env ]; then
    cp .env .env.backup
    echo "✅ Backed up current .env to .env.backup"
fi

# Switch to Supabase env
cp .env.supabase .env
echo "✅ Switched to Supabase configuration"

# Test connection
echo ""
echo "🧪 Testing Supabase connection..."
node testSupabaseConnection.js

echo ""
echo "📝 To start backend with Supabase:"
echo "  cd backend"
echo "  npm start"
echo ""
echo "To revert back to local database:"
echo "  cd backend"
echo "  cp .env.backup .env"