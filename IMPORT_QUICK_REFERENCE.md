# Historical Data Import Quick Reference

## 🚀 Quick Start Checklist

### 1. Pre-Import Setup
- [ ] Ensure all products exist in the Products table
- [ ] Backup current data
- [ ] Prepare Excel files according to templates
- [ ] Get authentication token

### 2. Import Order (IMPORTANT!)
1. **Initial Stock** → Use purchase order endpoint
2. **Monthly Consumption** → Use consumption endpoint  
3. **Additional Purchases** → Use purchase order endpoint
4. **Corrections** → Use corrections endpoint

### 3. File Formats at a Glance

#### Consumption Template
```
| SNO | DESIGN CODE | OPEN | JAN CONS. | FEB CONS. | MAR CONS. |
|     |             |      | 01/01/24  | 01/02/24  | 01/03/24  |
| 1   | ART-001     | 500  | 25        | 30        | 28        |
```

#### Purchase Order Template
```
| Artis Code | Date     | Amount (Kgs) | Notes           |
| ART-001    | 01/15/24 | 100         | PO-2024-001     |
```

#### Corrections Template
```
| Artis Code | Date (MM/DD/YY) | Correction Amount | Reason          |
| ART-001    | 01/31/24        | -50              | Physical count  |
```

## 📡 API Endpoints

```bash
# Base URL
BASE_URL="https://your-api-url.com/api"

# Get auth token
TOKEN=$(curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email","password":"your-password"}' \
  | jq -r '.token')

# Upload consumption
curl -X POST "$BASE_URL/inventory/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@consumption.xlsx"

# Upload purchases
curl -X POST "$BASE_URL/inventory/purchase-orders/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@purchases.xlsx"

# Upload corrections
curl -X POST "$BASE_URL/inventory/corrections/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@corrections.xlsx"
```

## 🔍 Quick Verification Queries

### Check Import Success
```sql
-- Summary of imported data
SELECT transaction_type, COUNT(*), SUM(quantity)
FROM "Transactions"
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY transaction_type;
```

### Verify Stock Levels
```sql
-- Products with stock discrepancies
WITH calc AS (
  SELECT 
    p.artis_codes[1] as code,
    p.current_stock,
    SUM(CASE 
      WHEN t.transaction_type = 'IN' THEN t.quantity
      WHEN t.transaction_type = 'OUT' THEN -t.quantity
      WHEN t.transaction_type = 'CORRECTION' THEN t.quantity
    END) as calculated
  FROM "Products" p
  LEFT JOIN "Transactions" t ON p.id = t.product_id
  GROUP BY p.id, p.artis_codes, p.current_stock
)
SELECT * FROM calc 
WHERE ABS(current_stock - calculated) > 0.01;
```

### Recent Activity
```sql
-- Last 10 transactions
SELECT 
  p.artis_codes[1] as product,
  t.transaction_type,
  t.quantity,
  t.transaction_date,
  t.notes
FROM "Transactions" t
JOIN "Products" p ON t.product_id = p.id
ORDER BY t.created_at DESC
LIMIT 10;
```

## ⚠️ Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Product not found" | Check artis_codes spelling, ensure product exists |
| Date parsing error | Use MM/DD/YY format for purchases/corrections |
| Stock mismatch | Run stock verification query, check for missing transactions |
| Negative stock | Review consumption dates and amounts |

## 📊 Generate Sample Data

```bash
# Run the sample data generator
python generate_sample_import_data.py

# This creates:
# - sample_initial_stock_import.xlsx
# - sample_consumption_import.xlsx  
# - sample_purchase_orders_import.xlsx
# - sample_corrections_import.xlsx
```

## 🎯 Best Practices

1. **Test First**: Import 5-10 products first
2. **Verify Each Step**: Check data after each upload
3. **Keep Logs**: Save API responses for troubleshooting
4. **Date Consistency**: Ensure chronological order
5. **Backup**: Always backup before bulk operations

## 📞 Support

For detailed instructions, see:
- `SUPABASE_HISTORICAL_DATA_IMPORT_GUIDE.md`
- `supabase_import_verification_queries.sql`