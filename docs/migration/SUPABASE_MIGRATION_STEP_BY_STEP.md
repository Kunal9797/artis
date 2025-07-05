# Supabase Migration - Step by Step (Error-Free Guide)

## 🚨 BEFORE YOU START - SAFETY CHECKLIST

### 1. Check Current System Health
```bash
# From artis/backend directory
cd /Users/kunal/.cursor-tutor/artis/backend

# Test current database connection
npm run dev
# ✅ Make sure server starts without errors
# ✅ Login to your web app and verify it works
```

### 2. Note Down Critical Info
Create a file `migration_info.txt` with:
```
Current Render Database URL: _______________
Current Backend URL: _______________________
Number of Products: ________________________
Number of Transactions: ____________________
Number of Users: ___________________________
```

### 3. Inform Your Team
Send message: "Doing database maintenance today. System might be slow for 2-3 hours. Will update when done."

---

## 📝 STEP 1: Create Supabase Account (20 minutes)

### 1.1 Sign Up
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with your email (use your business email)
4. Verify email

### 1.2 Create Project
1. Click "New Project"
2. Fill in:
   - **Organization**: Artis Laminates
   - **Project name**: artis-production
   - **Database Password**: [GENERATE STRONG PASSWORD]
   - **Region**: Singapore (closest to India)
   - **Pricing Plan**: Free (upgrade later if needed)

3. **IMPORTANT**: Save password in multiple places:
   - Your password manager
   - migration_info.txt file
   - Text file on desktop

### 1.3 Wait for Project Setup
- Takes 2-3 minutes
- Get coffee ☕

### 1.4 Save Connection Info
1. Go to Settings → Database
2. Copy and save these:
```
Connection string: postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
Connection pooling string: postgresql://postgres.[project-id]@[region].pooler.supabase.com:6543/postgres
Direct connection: postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

---

## 💾 STEP 2: Backup Current Database (30 minutes)

### 2.1 Get Render Database URL
1. Login to Render Dashboard
2. Go to your PostgreSQL database
3. Click "Connect" → "External Connection"
4. Copy the connection string

### 2.2 Create Backup Directory
```bash
cd /Users/kunal/.cursor-tutor/artis
mkdir -p database_backups/$(date +%Y%m%d)
cd database_backups/$(date +%Y%m%d)
```

### 2.3 Take Multiple Backups (Better Safe!)
```bash
# Set your Render DB URL
export RENDER_DB="postgresql://artis:password@host.render.com:5432/artis_db"

# Backup 1: Complete backup
pg_dump "$RENDER_DB" --no-owner --no-privileges > backup_complete.sql

# Backup 2: Schema only
pg_dump "$RENDER_DB" --schema-only --no-owner > backup_schema.sql

# Backup 3: Data only  
pg_dump "$RENDER_DB" --data-only --no-owner > backup_data.sql

# Backup 4: Each table separately (extra safe!)
pg_dump "$RENDER_DB" -t products --data-only > products.sql
pg_dump "$RENDER_DB" -t transactions --data-only > transactions.sql
pg_dump "$RENDER_DB" -t users --data-only > users.sql
pg_dump "$RENDER_DB" -t distributors --data-only > distributors.sql
```

### 2.4 Verify Backups
```bash
# Check file sizes
ls -lh *.sql

# Verify content
head -20 backup_complete.sql
grep -c "INSERT INTO" backup_data.sql
```

### 2.5 Extra Safety - Export to Excel
```sql
-- Run these in Render SQL console and save results
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as transaction_count FROM transactions;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as distributor_count FROM distributors;
```

---

## 🧪 STEP 3: Test Migration Process (45 minutes)

### 3.1 Create Test Supabase Project First
1. Create another Supabase project called "artis-test"
2. Use this for testing (we'll delete it later)

### 3.2 Test Import Process
```bash
# Use test database URL
export SUPABASE_TEST_DB="postgresql://postgres:[password]@db.[test-project-id].supabase.co:5432/postgres"

# Try importing schema first
psql "$SUPABASE_TEST_DB" < backup_schema.sql

# Check for errors - some are OK (like "role postgres already exists")
```

### 3.3 Common Issues and Fixes

**Issue 1: Extension errors**
```sql
-- If you see "extension already exists", it's OK
-- Supabase pre-installs common extensions
```

**Issue 2: Role/Permission errors**
```bash
# Clean the backup file
sed -i '' '/^GRANT/d' backup_complete.sql
sed -i '' '/^REVOKE/d' backup_complete.sql
sed -i '' '/^ALTER.*OWNER/d' backup_complete.sql
```

### 3.4 Test Data Import
```bash
# Import data to test database
psql "$SUPABASE_TEST_DB" < backup_data.sql

# Verify counts
psql "$SUPABASE_TEST_DB" -c "SELECT COUNT(*) FROM products;"
psql "$SUPABASE_TEST_DB" -c "SELECT COUNT(*) FROM transactions;"
```

### 3.5 If Test Succeeds
- ✅ All tables created
- ✅ Data counts match
- ✅ Can query data
- Delete test project from Supabase dashboard

---

## 🚀 STEP 4: Actual Migration (30 minutes)

### 4.1 Final Safety Check
```bash
# One more backup just before migration
pg_dump "$RENDER_DB" > final_backup_$(date +%H%M).sql
```

### 4.2 Import to Production Supabase
```bash
# Use your production Supabase URL
export SUPABASE_PROD_DB="postgresql://postgres:[password]@db.[prod-project-id].supabase.co:5432/postgres"

# Import schema
psql "$SUPABASE_PROD_DB" < backup_schema.sql

# Import data
psql "$SUPABASE_PROD_DB" < backup_data.sql
```

### 4.3 Verify Migration
1. Go to Supabase Dashboard
2. Click "Table Editor"
3. Check each table:
   - ✅ Products (check count)
   - ✅ Transactions (check recent dates)
   - ✅ Users (check your admin user exists)
   - ✅ Distributors (check a few names)

### 4.4 Run Test Queries
```sql
-- In Supabase SQL Editor
SELECT * FROM products LIMIT 10;
SELECT * FROM users WHERE role = 'admin';
SELECT COUNT(*) FROM transactions WHERE created_at > '2024-01-01';
```

---

## 🔧 STEP 5: Update Application (45 minutes)

### 5.1 Update Backend Environment
```bash
cd /Users/kunal/.cursor-tutor/artis/backend

# Backup current env
cp .env .env.render_backup

# Create new env file
cat > .env.supabase << EOF
# Database - Updated to Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# Keep these same as before
JWT_SECRET=$(grep JWT_SECRET .env | cut -d '=' -f2)
PORT=5000
NODE_ENV=development

# New Supabase keys (from Supabase Dashboard > Settings > API)
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key
EOF
```

### 5.2 Update Database Config
```bash
# Edit backend/src/config/database.ts
# Add SSL configuration for Supabase
```

File: `/artis/backend/src/config/database.ts`
```typescript
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000
  }
});

export default sequelize;
```

### 5.3 Test Locally
```bash
# Use new environment
mv .env .env.old
mv .env.supabase .env

# Start backend
npm run dev

# Should see: "Database connected successfully"
```

### 5.4 Test All Features
Open your web app and test:
- [ ] Login with your admin account
- [ ] View products list
- [ ] Add a test product
- [ ] View transactions
- [ ] Download Excel template
- [ ] Upload Excel file
- [ ] Check reports

---

## 🚦 STEP 6: Deploy to Production (30 minutes)

### 6.1 Update Render Environment
1. Go to Render Dashboard
2. Select your backend service
3. Go to Environment
4. Update `DATABASE_URL` with Supabase URL
5. Add new variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### 6.2 Trigger Deploy
1. Click "Manual Deploy" → "Deploy latest commit"
2. Watch logs for errors
3. Wait for "Live" status

### 6.3 Test Production
1. Visit your production URL
2. Test all critical features again
3. Ask team member to test

---

## 🆘 ROLLBACK PLAN (If Something Goes Wrong)

### Quick Rollback (5 minutes)
1. Go to Render Dashboard
2. Change `DATABASE_URL` back to old Render database
3. Redeploy
4. You're back to normal!

### Data Sync (if new data was added)
```bash
# Export new data from Supabase
pg_dump "$SUPABASE_PROD_DB" \
  --data-only \
  --table=transactions \
  --where="created_at > '2024-12-01'" \
  > new_transactions.sql

# Import to Render
psql "$RENDER_DB" < new_transactions.sql
```

---

## ✅ POST-MIGRATION CHECKLIST

### Immediate (Day 1)
- [ ] Test all features thoroughly
- [ ] Monitor for errors
- [ ] Keep Render database running (don't delete yet!)
- [ ] Take Supabase backup

### Week 1
- [ ] Daily backups
- [ ] Monitor performance
- [ ] Train team on Supabase dashboard
- [ ] Document any issues

### Week 2
- [ ] Enable Row Level Security
- [ ] Set up automated backups
- [ ] Optimize slow queries
- [ ] Plan Google Sheets integration

### Month 1
- [ ] Cancel Render database (save money)
- [ ] Implement real-time features
- [ ] Add monitoring

---

## 📞 TROUBLESHOOTING

### Can't connect to Supabase
- Check password (no special characters in URL)
- Try connection pooler URL instead
- Check firewall/network

### Import fails
- Use smaller chunks (table by table)
- Remove problematic constraints temporarily
- Import with --disable-triggers flag

### App won't start
- Check DATABASE_URL format
- Verify SSL settings
- Check Sequelize version compatibility

### Data missing
- Compare counts with backup
- Check for failed imports in logs
- Restore from table-specific backups

---

## 🎉 SUCCESS INDICATORS

You know migration worked when:
1. ✅ All data visible in Supabase dashboard
2. ✅ App works without errors
3. ✅ Can create new records
4. ✅ Excel import/export works
5. ✅ No performance degradation
6. ✅ Team can access system

Remember: Keep calm, follow steps, test everything twice!