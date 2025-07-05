-- Dashboard Queries for Artis Inventory Management
-- ================================================

-- 1. Current Inventory Status Summary
CREATE OR REPLACE VIEW dashboard_inventory_status AS
SELECT 
  COUNT(DISTINCT p.id) as total_products,
  COUNT(DISTINCT CASE WHEN p.current_stock <= p.min_stock_level THEN p.id END) as low_stock_count,
  COUNT(DISTINCT CASE WHEN p.current_stock = 0 THEN p.id END) as out_of_stock_count,
  ROUND(SUM(p.current_stock)::numeric, 2) as total_stock_kgs,
  ROUND(AVG(p.current_stock)::numeric, 2) as avg_stock_per_product
FROM "Products" p
WHERE p.active = true;

-- 2. Monthly Consumption Trend (Last 12 months)
CREATE OR REPLACE VIEW dashboard_consumption_trend AS
SELECT 
  TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') as month,
  COUNT(DISTINCT t.product_id) as products_consumed,
  ROUND(SUM(t.quantity)::numeric, 2) as total_consumption,
  ROUND(AVG(t.quantity)::numeric, 2) as avg_consumption_per_transaction
FROM "Transactions" t
WHERE t.transaction_type = 'OUT'
  AND t.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', t.transaction_date)
ORDER BY month DESC;

-- 3. Top 10 Most Consumed Products (Last 3 months)
CREATE OR REPLACE VIEW dashboard_top_consumed_products AS
SELECT 
  p.id,
  p.artis_codes[1] as primary_code,
  p.supplier,
  p.category,
  COUNT(t.id) as transaction_count,
  ROUND(SUM(t.quantity)::numeric, 2) as total_consumed,
  p.current_stock,
  CASE 
    WHEN p.current_stock <= p.min_stock_level THEN 'Low Stock'
    WHEN p.current_stock = 0 THEN 'Out of Stock'
    ELSE 'In Stock'
  END as stock_status
FROM "Products" p
JOIN "Transactions" t ON p.id = t.product_id
WHERE t.transaction_type = 'OUT'
  AND t.transaction_date >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY p.id, p.artis_codes, p.supplier, p.category, p.current_stock, p.min_stock_level
ORDER BY total_consumed DESC
LIMIT 10;

-- 4. Recent Purchase Summary (Last 30 days)
CREATE OR REPLACE VIEW dashboard_recent_purchases AS
SELECT 
  DATE(t.transaction_date) as purchase_date,
  COUNT(DISTINCT t.product_id) as products_purchased,
  COUNT(t.id) as purchase_count,
  ROUND(SUM(t.quantity)::numeric, 2) as total_quantity,
  STRING_AGG(DISTINCT p.supplier, ', ' ORDER BY p.supplier) as suppliers
FROM "Transactions" t
JOIN "Products" p ON t.product_id = p.id
WHERE t.transaction_type = 'IN'
  AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(t.transaction_date)
ORDER BY purchase_date DESC;

-- 5. Category-wise Stock Distribution
CREATE OR REPLACE VIEW dashboard_category_distribution AS
SELECT 
  COALESCE(p.category, 'Uncategorized') as category,
  COUNT(p.id) as product_count,
  ROUND(SUM(p.current_stock)::numeric, 2) as total_stock,
  ROUND(AVG(p.current_stock)::numeric, 2) as avg_stock,
  COUNT(CASE WHEN p.current_stock <= p.min_stock_level THEN 1 END) as low_stock_products
FROM "Products" p
WHERE p.active = true
GROUP BY p.category
ORDER BY total_stock DESC;

-- 6. Supplier Performance (Last 6 months)
CREATE OR REPLACE VIEW dashboard_supplier_performance AS
SELECT 
  p.supplier,
  COUNT(DISTINCT p.id) as product_count,
  COUNT(DISTINCT t.id) as transaction_count,
  ROUND(SUM(CASE WHEN t.transaction_type = 'IN' THEN t.quantity ELSE 0 END)::numeric, 2) as total_purchased,
  ROUND(SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END)::numeric, 2) as total_consumed,
  ROUND(AVG(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity END)::numeric, 2) as avg_consumption
FROM "Products" p
LEFT JOIN "Transactions" t ON p.id = t.product_id
  AND t.transaction_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY p.supplier
HAVING p.supplier IS NOT NULL
ORDER BY total_consumed DESC;

-- 7. Monthly Inventory Movement Summary
CREATE OR REPLACE VIEW dashboard_monthly_movement AS
SELECT 
  TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'Mon YYYY') as month,
  SUM(CASE WHEN t.transaction_type = 'IN' THEN t.quantity ELSE 0 END) as total_in,
  SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END) as total_out,
  SUM(CASE WHEN t.transaction_type = 'CORRECTION' THEN t.quantity ELSE 0 END) as total_corrections,
  SUM(CASE WHEN t.transaction_type = 'IN' THEN t.quantity ELSE 0 END) - 
  SUM(CASE WHEN t.transaction_type = 'OUT' THEN t.quantity ELSE 0 END) as net_change
FROM "Transactions" t
WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', t.transaction_date)
ORDER BY DATE_TRUNC('month', t.transaction_date) DESC;

-- 8. Product Velocity Analysis
CREATE OR REPLACE VIEW dashboard_product_velocity AS
WITH consumption_stats AS (
  SELECT 
    p.id,
    p.artis_codes[1] as primary_code,
    p.supplier,
    p.current_stock,
    COUNT(t.id) as transaction_count,
    ROUND(SUM(t.quantity)::numeric, 2) as total_consumed,
    ROUND(AVG(t.quantity)::numeric, 2) as avg_consumption,
    DATE_PART('day', NOW() - MIN(t.transaction_date)) as days_tracked
  FROM "Products" p
  LEFT JOIN "Transactions" t ON p.id = t.product_id
    AND t.transaction_type = 'OUT'
    AND t.transaction_date >= CURRENT_DATE - INTERVAL '90 days'
  WHERE p.active = true
  GROUP BY p.id, p.artis_codes, p.supplier, p.current_stock
)
SELECT 
  *,
  CASE 
    WHEN days_tracked > 0 THEN ROUND((total_consumed / days_tracked * 30)::numeric, 2)
    ELSE 0
  END as monthly_run_rate,
  CASE 
    WHEN total_consumed > 0 AND days_tracked > 0 THEN 
      ROUND((current_stock / (total_consumed / days_tracked))::numeric, 0)
    ELSE NULL
  END as days_of_stock
FROM consumption_stats
ORDER BY monthly_run_rate DESC;

-- Query Examples for Dashboard:
-- =============================

-- Get current inventory status
-- SELECT * FROM dashboard_inventory_status;

-- Get monthly consumption trend
-- SELECT * FROM dashboard_consumption_trend;

-- Get top consumed products
-- SELECT * FROM dashboard_top_consumed_products;

-- Get recent purchases
-- SELECT * FROM dashboard_recent_purchases;

-- Get category distribution
-- SELECT * FROM dashboard_category_distribution;

-- Get supplier performance
-- SELECT * FROM dashboard_supplier_performance;

-- Get monthly movement summary
-- SELECT * FROM dashboard_monthly_movement;

-- Get product velocity analysis
-- SELECT * FROM dashboard_product_velocity WHERE days_of_stock < 30;