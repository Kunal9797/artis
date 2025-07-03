-- Create a view for quick stats that updates automatically
-- This will significantly improve dashboard performance

-- Monthly consumption and purchases view
CREATE OR REPLACE VIEW monthly_stats AS
SELECT 
  TO_CHAR(t.date, 'YYYY-MM') as month_sort,
  TO_CHAR(t.date, 'Mon YYYY') as month_display,
  p.thickness,
  p.supplier,
  p.category,
  SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as consumption,
  SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as purchases,
  COUNT(DISTINCT CASE WHEN t.type = 'OUT' THEN t.id END) as consumption_count,
  COUNT(DISTINCT CASE WHEN t.type = 'IN' THEN t.id END) as purchase_count
FROM "Transactions" t
INNER JOIN "Products" p ON t."productId" = p.id
GROUP BY 
  TO_CHAR(t.date, 'YYYY-MM'),
  TO_CHAR(t.date, 'Mon YYYY'),
  p.thickness,
  p.supplier,
  p.category;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_stats_month ON "Transactions" (date);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_thickness ON "Products" (thickness);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_supplier ON "Products" (supplier);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_category ON "Products" (category);

-- Product summary view for totals
CREATE OR REPLACE VIEW product_summary AS
SELECT 
  COUNT(DISTINCT p.id) as total_products,
  SUM(p."currentStock") as total_stock,
  AVG(p."avgConsumption") as avg_consumption,
  COUNT(DISTINCT p.supplier) as total_suppliers,
  COUNT(DISTINCT p.category) as total_categories
FROM "Products" p;

-- Supplier breakdown view
CREATE OR REPLACE VIEW supplier_stats AS
SELECT 
  p.supplier,
  COUNT(DISTINCT p.id) as product_count,
  SUM(p."currentStock") as total_stock,
  AVG(p."avgConsumption") as avg_consumption,
  (
    SELECT SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END)
    FROM "Transactions" t 
    WHERE t."productId" IN (SELECT id FROM "Products" WHERE supplier = p.supplier)
  ) as total_consumption,
  (
    SELECT SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END)
    FROM "Transactions" t 
    WHERE t."productId" IN (SELECT id FROM "Products" WHERE supplier = p.supplier)
  ) as total_purchases
FROM "Products" p
WHERE p.supplier IS NOT NULL
GROUP BY p.supplier;

-- Category breakdown view
CREATE OR REPLACE VIEW category_stats AS
SELECT 
  p.category,
  COUNT(DISTINCT p.id) as product_count,
  SUM(p."currentStock") as total_stock,
  AVG(p."avgConsumption") as avg_consumption,
  (
    SELECT SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END)
    FROM "Transactions" t 
    WHERE t."productId" IN (SELECT id FROM "Products" WHERE category = p.category)
  ) as total_consumption,
  (
    SELECT SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END)
    FROM "Transactions" t 
    WHERE t."productId" IN (SELECT id FROM "Products" WHERE category = p.category)
  ) as total_purchases
FROM "Products" p
WHERE p.category IS NOT NULL
GROUP BY p.category;

-- Recent average view (for trend line)
CREATE OR REPLACE VIEW recent_averages AS
SELECT 
  AVG(consumption) as avg_consumption,
  AVG(purchases) as avg_purchases
FROM (
  SELECT 
    TO_CHAR(t.date, 'YYYY-MM') as month,
    SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as consumption,
    SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as purchases
  FROM "Transactions" t
  WHERE t.date >= CURRENT_DATE - INTERVAL '3 months'
  GROUP BY TO_CHAR(t.date, 'YYYY-MM')
) recent_months;

-- Grant permissions for the app user
GRANT SELECT ON monthly_stats TO authenticated;
GRANT SELECT ON product_summary TO authenticated;
GRANT SELECT ON supplier_stats TO authenticated;
GRANT SELECT ON category_stats TO authenticated;
GRANT SELECT ON recent_averages TO authenticated;