-- Supabase Historical Data Import Verification Queries
-- Run these queries after importing your historical inventory data

-- ============================================
-- 1. OVERVIEW: Transaction Summary
-- ============================================
-- Shows count and total quantity by transaction type
SELECT 
  transaction_type,
  COUNT(*) as transaction_count,
  ROUND(SUM(quantity)::numeric, 2) as total_quantity,
  MIN(transaction_date) as earliest_date,
  MAX(transaction_date) as latest_date
FROM "Transactions"
GROUP BY transaction_type
ORDER BY transaction_type;

-- ============================================
-- 2. STOCK VERIFICATION: Compare Calculated vs Stored Stock
-- ============================================
-- Identifies any discrepancies between calculated and stored stock levels
WITH stock_calculation AS (
  SELECT 
    p.id,
    p.artis_codes[1] as primary_code,
    p.artis_codes as all_codes,
    p.current_stock as stored_stock,
    COALESCE(SUM(
      CASE 
        WHEN t.transaction_type = 'IN' THEN t.quantity
        WHEN t.transaction_type = 'OUT' THEN -t.quantity
        WHEN t.transaction_type = 'CORRECTION' THEN t.quantity
        ELSE 0
      END
    ), 0) as calculated_stock
  FROM "Products" p
  LEFT JOIN "Transactions" t ON p.id = t.product_id
  GROUP BY p.id, p.artis_codes, p.current_stock
)
SELECT 
  primary_code,
  ROUND(stored_stock::numeric, 2) as stored_stock,
  ROUND(calculated_stock::numeric, 2) as calculated_stock,
  ROUND((stored_stock - calculated_stock)::numeric, 2) as difference,
  CASE 
    WHEN ABS(stored_stock - calculated_stock) < 0.01 THEN '✓ OK'
    ELSE '⚠️ MISMATCH'
  END as status
FROM stock_calculation
ORDER BY ABS(stored_stock - calculated_stock) DESC;

-- ============================================
-- 3. PRODUCT TRANSACTION HISTORY
-- ============================================
-- View detailed transaction history for a specific product
-- Change 'ART-001' to your desired product code
WITH product_transactions AS (
  SELECT 
    t.id,
    t.transaction_date,
    t.transaction_type,
    t.quantity,
    t.notes,
    t.created_at,
    p.artis_codes[1] as product_code
  FROM "Transactions" t
  JOIN "Products" p ON t.product_id = p.id
  WHERE 'ART-001' = ANY(p.artis_codes)  -- Change this code as needed
)
SELECT 
  transaction_date,
  transaction_type,
  ROUND(quantity::numeric, 2) as quantity,
  notes,
  SUM(
    CASE 
      WHEN transaction_type = 'IN' THEN quantity
      WHEN transaction_type = 'OUT' THEN -quantity
      WHEN transaction_type = 'CORRECTION' THEN quantity
    END
  ) OVER (ORDER BY transaction_date, created_at) as running_balance
FROM product_transactions
ORDER BY transaction_date DESC, created_at DESC
LIMIT 50;

-- ============================================
-- 4. MONTHLY INVENTORY MOVEMENT SUMMARY
-- ============================================
-- Shows monthly IN/OUT movements for all products
SELECT 
  TO_CHAR(transaction_date, 'YYYY-MM') as month,
  COUNT(DISTINCT p.id) as active_products,
  COUNT(CASE WHEN transaction_type = 'IN' THEN 1 END) as purchase_count,
  ROUND(SUM(CASE WHEN transaction_type = 'IN' THEN quantity ELSE 0 END)::numeric, 2) as total_purchases_kg,
  COUNT(CASE WHEN transaction_type = 'OUT' THEN 1 END) as consumption_count,
  ROUND(SUM(CASE WHEN transaction_type = 'OUT' THEN quantity ELSE 0 END)::numeric, 2) as total_consumption_kg,
  COUNT(CASE WHEN transaction_type = 'CORRECTION' THEN 1 END) as correction_count,
  ROUND(SUM(CASE WHEN transaction_type = 'CORRECTION' THEN quantity ELSE 0 END)::numeric, 2) as net_corrections_kg
FROM "Transactions" t
JOIN "Products" p ON t.product_id = p.id
WHERE transaction_date >= '2024-01-01'
GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
ORDER BY month;

-- ============================================
-- 5. TOP CONSUMING PRODUCTS
-- ============================================
-- Shows products with highest consumption in the last 6 months
SELECT 
  p.artis_codes[1] as product_code,
  p.supplier,
  p.category,
  COUNT(t.id) as transaction_count,
  ROUND(SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END)::numeric, 2) as total_consumption,
  ROUND(AVG(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE NULL END)::numeric, 2) as avg_consumption_per_transaction
FROM "Products" p
JOIN "Transactions" t ON p.id = t.product_id
WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
  AND t.transaction_type = 'OUT'
GROUP BY p.id, p.artis_codes, p.supplier, p.category
ORDER BY total_consumption DESC
LIMIT 20;

-- ============================================
-- 6. DATA INTEGRITY CHECKS
-- ============================================
-- Check for various data integrity issues

-- 6.1 Orphaned transactions (no matching product)
SELECT 
  'Orphaned Transactions' as check_type,
  COUNT(*) as issue_count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '❌ FAIL' END as status
FROM "Transactions" t
LEFT JOIN "Products" p ON t.product_id = p.id
WHERE p.id IS NULL;

-- 6.2 Products with negative stock at any point
WITH stock_timeline AS (
  SELECT 
    p.id,
    p.artis_codes[1] as product_code,
    t.transaction_date,
    SUM(
      CASE 
        WHEN t2.transaction_type = 'IN' THEN t2.quantity
        WHEN t2.transaction_type = 'OUT' THEN -t2.quantity
        WHEN t2.transaction_type = 'CORRECTION' THEN t2.quantity
      END
    ) OVER (PARTITION BY p.id ORDER BY t2.transaction_date, t2.created_at) as running_stock
  FROM "Products" p
  JOIN "Transactions" t ON p.id = t.product_id
  JOIN "Transactions" t2 ON t2.product_id = p.id 
    AND (t2.transaction_date < t.transaction_date 
         OR (t2.transaction_date = t.transaction_date AND t2.created_at <= t.created_at))
),
negative_stocks AS (
  SELECT DISTINCT 
    product_code,
    MIN(running_stock) as minimum_stock
  FROM stock_timeline
  GROUP BY product_code
  HAVING MIN(running_stock) < 0
)
SELECT 
  'Products with Negative Stock History' as check_type,
  COUNT(*) as issue_count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '❌ FAIL - Review products: ' || STRING_AGG(product_code, ', ') END as status
FROM negative_stocks;

-- 6.3 Transactions with future dates
SELECT 
  'Future Dated Transactions' as check_type,
  COUNT(*) as issue_count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '❌ FAIL' END as status
FROM "Transactions"
WHERE transaction_date > CURRENT_DATE;

-- 6.4 Products without any transactions
SELECT 
  'Products Without Transactions' as check_type,
  COUNT(*) as issue_count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '⚠️ WARNING - ' || COUNT(*) || ' products have no transactions' END as status
FROM "Products" p
LEFT JOIN "Transactions" t ON p.id = t.product_id
WHERE t.id IS NULL;

-- ============================================
-- 7. RECENT ACTIVITY LOG
-- ============================================
-- Shows the most recent transactions across all products
SELECT 
  p.artis_codes[1] as product_code,
  t.transaction_type,
  ROUND(t.quantity::numeric, 2) as quantity,
  t.transaction_date,
  t.notes,
  TO_CHAR(t.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
FROM "Transactions" t
JOIN "Products" p ON t.product_id = p.id
ORDER BY t.created_at DESC
LIMIT 25;

-- ============================================
-- 8. IMPORT STATISTICS BY DATE
-- ============================================
-- Shows when transactions were created (useful for tracking bulk imports)
SELECT 
  DATE(created_at) as import_date,
  COUNT(*) as transactions_imported,
  COUNT(DISTINCT product_id) as unique_products,
  STRING_AGG(DISTINCT transaction_type, ', ') as transaction_types,
  MIN(transaction_date) as earliest_transaction,
  MAX(transaction_date) as latest_transaction
FROM "Transactions"
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY import_date DESC;

-- ============================================
-- 9. CONSUMPTION PATTERNS BY PRODUCT LINE
-- ============================================
-- Analyzes consumption patterns for different product lines
WITH product_lines AS (
  SELECT 
    p.id,
    p.artis_codes[1] as product_code,
    CASE 
      WHEN p.artis_codes[1] LIKE 'ART-%' THEN 'Artis (1mm)'
      WHEN p.artis_codes[1] LIKE 'WDR-%' THEN 'Woodrica (0.8mm)'
      WHEN p.artis_codes[1] LIKE 'ATV-%' THEN 'Artvio (0.8mm)'
      ELSE 'Other'
    END as product_line,
    p.thickness
  FROM "Products" p
)
SELECT 
  pl.product_line,
  COUNT(DISTINCT pl.id) as product_count,
  COUNT(t.id) as transaction_count,
  ROUND(SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END)::numeric, 2) as total_consumption,
  ROUND(AVG(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE NULL END)::numeric, 2) as avg_consumption_per_transaction,
  ROUND(SUM(CASE WHEN t.transaction_type = 'IN' THEN t.quantity ELSE 0 END)::numeric, 2) as total_purchases
FROM product_lines pl
LEFT JOIN "Transactions" t ON pl.id = t.product_id
WHERE t.transaction_date >= '2024-01-01'
GROUP BY pl.product_line
ORDER BY total_consumption DESC;

-- ============================================
-- 10. STOCK ALERTS - LOW STOCK PRODUCTS
-- ============================================
-- Identifies products that may need reordering based on consumption patterns
WITH consumption_analysis AS (
  SELECT 
    p.id,
    p.artis_codes[1] as product_code,
    p.current_stock,
    p.min_stock_level,
    -- Calculate average monthly consumption
    ROUND(AVG(
      CASE 
        WHEN t.transaction_type = 'OUT' AND t.transaction_date >= CURRENT_DATE - INTERVAL '3 months'
        THEN t.quantity 
        ELSE NULL 
      END
    )::numeric * 30, 2) as avg_monthly_consumption
  FROM "Products" p
  LEFT JOIN "Transactions" t ON p.id = t.product_id
  GROUP BY p.id, p.artis_codes, p.current_stock, p.min_stock_level
)
SELECT 
  product_code,
  ROUND(current_stock::numeric, 2) as current_stock,
  ROUND(min_stock_level::numeric, 2) as min_stock_level,
  avg_monthly_consumption,
  CASE 
    WHEN avg_monthly_consumption > 0 
    THEN ROUND((current_stock / NULLIF(avg_monthly_consumption, 0) * 30)::numeric, 1)
    ELSE NULL
  END as days_of_stock_remaining,
  CASE
    WHEN current_stock < COALESCE(min_stock_level, 0) THEN '🔴 CRITICAL'
    WHEN avg_monthly_consumption > 0 AND current_stock / avg_monthly_consumption * 30 < 15 THEN '🟡 LOW'
    ELSE '🟢 OK'
  END as stock_status
FROM consumption_analysis
WHERE avg_monthly_consumption > 0
ORDER BY 
  CASE
    WHEN current_stock < COALESCE(min_stock_level, 0) THEN 1
    WHEN avg_monthly_consumption > 0 AND current_stock / avg_monthly_consumption * 30 < 15 THEN 2
    ELSE 3
  END,
  days_of_stock_remaining ASC NULLS LAST
LIMIT 20;

-- ============================================
-- 11. IMPORT VALIDATION SUMMARY
-- ============================================
-- Quick validation of imported data
WITH import_stats AS (
  SELECT 
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN p.id END) as products_with_transactions,
    COUNT(t.id) as total_transactions,
    MIN(t.transaction_date) as earliest_transaction,
    MAX(t.transaction_date) as latest_transaction,
    COUNT(DISTINCT DATE(t.created_at)) as import_days
  FROM "Products" p
  LEFT JOIN "Transactions" t ON p.id = t.product_id
)
SELECT 
  'Total Products' as metric,
  total_products::text as value
FROM import_stats
UNION ALL
SELECT 
  'Products with Transactions',
  products_with_transactions || ' (' || 
  ROUND(products_with_transactions::numeric / NULLIF(total_products, 0) * 100, 1) || '%)'
FROM import_stats
UNION ALL
SELECT 
  'Total Transactions',
  total_transactions::text
FROM import_stats
UNION ALL
SELECT 
  'Date Range',
  earliest_transaction || ' to ' || latest_transaction
FROM import_stats
UNION ALL
SELECT 
  'Import Sessions',
  import_days || ' different days'
FROM import_stats;

-- ============================================
-- 12. DETAILED PRODUCT INVENTORY REPORT
-- ============================================
-- Comprehensive view of all products with their current status
SELECT 
  p.artis_codes[1] as product_code,
  p.supplier,
  p.category,
  ROUND(p.current_stock::numeric, 2) as current_stock,
  ROUND(p.avg_consumption::numeric, 2) as avg_consumption,
  COUNT(t.id) as total_transactions,
  COUNT(CASE WHEN t.transaction_type = 'IN' THEN 1 END) as purchases,
  COUNT(CASE WHEN t.transaction_type = 'OUT' THEN 1 END) as consumptions,
  COUNT(CASE WHEN t.transaction_type = 'CORRECTION' THEN 1 END) as corrections,
  MAX(CASE WHEN t.transaction_type = 'IN' THEN t.transaction_date END) as last_purchase,
  MAX(CASE WHEN t.transaction_type = 'OUT' THEN t.transaction_date END) as last_consumption,
  p.last_updated
FROM "Products" p
LEFT JOIN "Transactions" t ON p.id = t.product_id
GROUP BY p.id, p.artis_codes, p.supplier, p.category, p.current_stock, p.avg_consumption, p.last_updated
ORDER BY p.current_stock DESC
LIMIT 50;