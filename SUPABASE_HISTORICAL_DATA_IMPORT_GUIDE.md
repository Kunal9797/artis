# Supabase Historical Data Import Guide

This guide provides step-by-step instructions for importing historical inventory data (consumption and purchases) into the Supabase Transactions table using the existing bulk upload endpoints.

## Table of Contents
1. [Understanding the Data Structure](#understanding-the-data-structure)
2. [Preparing Excel Data](#preparing-excel-data)
3. [Using the Upload Endpoints](#using-the-upload-endpoints)
4. [Verifying Data Import](#verifying-data-import)
5. [SQL Verification Queries](#sql-verification-queries)

## Understanding the Data Structure

### Database Tables
- **Products Table**: Contains product information
  - `id`: UUID primary key
  - `artis_codes`: Array of design codes
  - `current_stock`: Current inventory level
  - Other fields: supplier, category, etc.

- **Transactions Table**: Records all inventory movements
  - `id`: UUID primary key
  - `product_id`: Foreign key to Products
  - `transaction_type`: 'IN' (purchases), 'OUT' (consumption), 'CORRECTION'
  - `quantity`: Amount in kg
  - `transaction_date`: Date of transaction
  - `notes`: Additional information

## Preparing Excel Data

### 1. Consumption Data Template

Create an Excel file with the following structure for historical consumption:

| SNO | DESIGN CODE | OPEN | 01/02/24 | 01/03/24 | 01/04/24 | 01/05/24 | 01/06/24 |
|-----|-------------|------|----------|----------|----------|----------|----------|
| 1   | ART-001     | 500  | 25       | 30       | 28       | 35       | 40       |
| 2   | ART-002     | 750  | 40       | 45       | 50       | 48       | 52       |
| 3   | WDR-101     | 300  | 15       | 20       | 18       | 22       | 25       |

**Notes:**
- First row: Headers (SNO, DESIGN CODE, OPEN for initial stock)
- Second row: Dates in DD/MM/YY format for consumption columns
- DESIGN CODE: Must match artis_codes in the Products table
- OPEN: Initial stock as of the starting date
- Date columns: Monthly consumption amounts in kg

### 2. Purchase Order Template

Create an Excel file for historical purchases:

| Artis Code | Date      | Amount (Kgs) | Notes                    |
|------------|-----------|--------------|--------------------------|
| ART-001    | 02/15/24  | 100         | Purchase Order #PO-2024-001 |
| ART-002    | 03/20/24  | 200         | Supplier: ABC Papers     |
| WDR-101    | 04/10/24  | 150         | Emergency stock refill   |

**Notes:**
- Date format: MM/DD/YY
- Amount must be positive numbers
- Notes field is optional but recommended for tracking

### 3. Correction Template (for adjustments)

For inventory corrections or adjustments:

| Artis Code | Date (MM/DD/YY) | Correction Amount | Reason                        |
|------------|-----------------|-------------------|-------------------------------|
| ART-001    | 01/31/24        | -50              | Physical count adjustment     |
| ART-002    | 02/28/24        | 75               | Found additional stock        |
| WDR-101    | 03/15/24        | -25              | Damaged goods write-off      |

**Notes:**
- Positive amounts increase stock
- Negative amounts decrease stock
- Reason field is required

## Using the Upload Endpoints

### API Endpoints

1. **Consumption Upload**: `POST /api/inventory/upload`
2. **Purchase Upload**: `POST /api/inventory/purchase-orders/upload`
3. **Corrections Upload**: `POST /api/inventory/corrections/upload`

### Upload Process

#### Step 1: Authentication
First, obtain a JWT token:
```bash
curl -X POST http://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email", "password": "your-password"}'
```

#### Step 2: Upload Consumption Data
```bash
curl -X POST http://your-api-url/api/inventory/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@consumption-data.xlsx"
```

#### Step 3: Upload Purchase Orders
```bash
curl -X POST http://your-api-url/api/inventory/purchase-orders/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@purchase-orders.xlsx"
```

#### Step 4: Upload Corrections (if needed)
```bash
curl -X POST http://your-api-url/api/inventory/corrections/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@corrections.xlsx"
```

### Expected Response
```json
{
  "success": true,
  "processed": ["ART-001", "ART-002", "WDR-101"],
  "skipped": [
    {
      "artisCode": "INVALID-001",
      "reason": "Product not found"
    }
  ]
}
```

## Verifying Data Import

### Through the Application

1. Navigate to the Inventory page
2. Check the current stock levels for imported products
3. Click on individual products to view transaction history
4. Verify that all transactions appear with correct dates and amounts

### Direct Database Verification

Use these SQL queries to verify the import:

## SQL Verification Queries

### 1. Check Total Transactions by Type
```sql
-- Count transactions by type
SELECT 
  transaction_type,
  COUNT(*) as count,
  SUM(quantity) as total_quantity
FROM "Transactions"
GROUP BY transaction_type
ORDER BY transaction_type;
```

### 2. Verify Product Stock Calculations
```sql
-- Compare calculated stock with stored current_stock
WITH stock_calc AS (
  SELECT 
    p.id,
    p.artis_codes[1] as artis_code,
    p.current_stock as stored_stock,
    COALESCE(SUM(
      CASE 
        WHEN t.transaction_type = 'IN' THEN t.quantity
        WHEN t.transaction_type = 'OUT' THEN -t.quantity
        WHEN t.transaction_type = 'CORRECTION' THEN t.quantity
      END
    ), 0) as calculated_stock
  FROM "Products" p
  LEFT JOIN "Transactions" t ON p.id = t.product_id
  GROUP BY p.id, p.artis_codes, p.current_stock
)
SELECT 
  artis_code,
  stored_stock,
  calculated_stock,
  ROUND(stored_stock - calculated_stock, 2) as difference
FROM stock_calc
WHERE ABS(stored_stock - calculated_stock) > 0.01
ORDER BY difference DESC;
```

### 3. Transaction History for Specific Product
```sql
-- View transaction history for a specific product
SELECT 
  t.transaction_date,
  t.transaction_type,
  t.quantity,
  t.notes,
  SUM(
    CASE 
      WHEN t2.transaction_type = 'IN' THEN t2.quantity
      WHEN t2.transaction_type = 'OUT' THEN -t2.quantity
      WHEN t2.transaction_type = 'CORRECTION' THEN t2.quantity
    END
  ) OVER (ORDER BY t2.transaction_date, t2.created_at) as running_balance
FROM "Transactions" t
JOIN "Products" p ON t.product_id = p.id
JOIN "Transactions" t2 ON t2.product_id = p.id AND (t2.transaction_date < t.transaction_date OR (t2.transaction_date = t.transaction_date AND t2.created_at <= t.created_at))
WHERE 'ART-001' = ANY(p.artis_codes)
GROUP BY t.id, t.transaction_date, t.transaction_type, t.quantity, t.notes, t.created_at
ORDER BY t.transaction_date DESC, t.created_at DESC;
```

### 4. Monthly Consumption Summary
```sql
-- Monthly consumption by product
SELECT 
  p.artis_codes[1] as artis_code,
  DATE_TRUNC('month', t.transaction_date) as month,
  SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END) as consumption,
  SUM(CASE WHEN t.transaction_type = 'IN' THEN t.quantity ELSE 0 END) as purchases
FROM "Transactions" t
JOIN "Products" p ON t.product_id = p.id
WHERE t.transaction_date >= '2024-01-01'
GROUP BY p.artis_codes, DATE_TRUNC('month', t.transaction_date)
ORDER BY artis_code, month;
```

### 5. Data Integrity Checks
```sql
-- Check for orphaned transactions
SELECT COUNT(*) as orphaned_transactions
FROM "Transactions" t
LEFT JOIN "Products" p ON t.product_id = p.id
WHERE p.id IS NULL;

-- Check for negative stock situations
WITH running_stock AS (
  SELECT 
    p.artis_codes[1] as artis_code,
    t.transaction_date,
    SUM(
      CASE 
        WHEN t2.transaction_type = 'IN' THEN t2.quantity
        WHEN t2.transaction_type = 'OUT' THEN -t2.quantity
        WHEN t2.transaction_type = 'CORRECTION' THEN t2.quantity
      END
    ) OVER (PARTITION BY p.id ORDER BY t2.transaction_date) as stock_after
  FROM "Transactions" t
  JOIN "Products" p ON t.product_id = p.id
  JOIN "Transactions" t2 ON t2.product_id = p.id AND t2.transaction_date <= t.transaction_date
)
SELECT DISTINCT artis_code, MIN(stock_after) as min_stock
FROM running_stock
GROUP BY artis_code
HAVING MIN(stock_after) < 0
ORDER BY min_stock;
```

### 6. Recent Transactions
```sql
-- View most recent transactions
SELECT 
  p.artis_codes[1] as artis_code,
  t.transaction_type,
  t.quantity,
  t.transaction_date,
  t.notes
FROM "Transactions" t
JOIN "Products" p ON t.product_id = p.id
ORDER BY t.created_at DESC
LIMIT 20;
```

## Best Practices

1. **Backup Before Import**: Always backup your data before bulk imports
2. **Test with Small Dataset**: Start with a few products to verify the process
3. **Verify Product Codes**: Ensure all design codes exist in the Products table
4. **Date Consistency**: Use consistent date formats in your Excel files
5. **Monitor Upload Response**: Check the response for skipped rows and investigate why

## Troubleshooting

### Common Issues

1. **"Product not found" errors**
   - Verify the design code exists in Products table
   - Check for typos or extra spaces
   - Use this query to find products:
   ```sql
   SELECT id, artis_codes FROM "Products" 
   WHERE 'YOUR-CODE' = ANY(artis_codes);
   ```

2. **Date parsing errors**
   - Ensure dates are in the correct format (MM/DD/YY for purchases)
   - Avoid date formats with text (e.g., "Jan 1, 2024")

3. **Stock discrepancies**
   - Run the stock verification query above
   - Check for missing transactions
   - Verify initial stock values

## Sample Data Generation

Here's a Python script to generate sample Excel files:

```python
import pandas as pd
from datetime import datetime, timedelta
import random

# Generate sample consumption data
def create_consumption_sample():
    products = ['ART-001', 'ART-002', 'ART-003', 'WDR-101', 'WDR-102']
    
    # Create headers
    headers = ['SNO', 'DESIGN CODE', 'OPEN']
    
    # Add monthly consumption columns
    start_date = datetime(2024, 1, 1)
    for i in range(6):
        date = start_date + timedelta(days=30*i)
        headers.append(date.strftime('%d/%m/%y'))
    
    # Create data
    data = []
    for idx, product in enumerate(products):
        row = [idx + 1, product, random.randint(300, 1000)]
        # Add consumption for each month
        for _ in range(6):
            row.append(random.randint(20, 80))
        data.append(row)
    
    df = pd.DataFrame(data, columns=headers)
    df.to_excel('sample_consumption.xlsx', index=False)

# Generate sample purchase orders
def create_purchase_sample():
    products = ['ART-001', 'ART-002', 'ART-003', 'WDR-101', 'WDR-102']
    
    data = []
    for _ in range(15):
        product = random.choice(products)
        date = datetime(2024, 1, 1) + timedelta(days=random.randint(0, 180))
        amount = random.randint(100, 500)
        po_number = f"PO-2024-{random.randint(1000, 9999)}"
        
        data.append({
            'Artis Code': product,
            'Date': date.strftime('%m/%d/%y'),
            'Amount (Kgs)': amount,
            'Notes': f'Purchase Order #{po_number}'
        })
    
    df = pd.DataFrame(data)
    df.to_excel('sample_purchases.xlsx', index=False)

# Run the functions
create_consumption_sample()
create_purchase_sample()
print("Sample files created!")
```

## Conclusion

Following this guide will help you successfully import historical inventory data into your Supabase database. Remember to:

1. Prepare your Excel files according to the templates
2. Test with a small dataset first
3. Verify the import using the SQL queries provided
4. Keep backups of your original data

For any issues or questions, refer to the troubleshooting section or check the application logs for detailed error messages.