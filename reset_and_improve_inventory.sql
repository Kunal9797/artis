-- Reset and Improve Inventory System
-- ==================================

-- Step 1: Reset all product stock to 0
UPDATE "Products" 
SET "currentStock" = 0, 
    "avgConsumption" = 0,
    "lastUpdated" = NOW();

-- Step 2: Create a function to calculate current stock dynamically
CREATE OR REPLACE FUNCTION calculate_product_stock(product_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    stock_level NUMERIC := 0;
BEGIN
    -- Calculate stock from all transactions
    SELECT COALESCE(SUM(
        CASE 
            WHEN type = 'IN' THEN quantity
            WHEN type = 'OUT' THEN -quantity
            WHEN type = 'CORRECTION' THEN quantity
        END
    ), 0) INTO stock_level
    FROM "Transactions"
    WHERE "productId" = product_id;
    
    RETURN ROUND(stock_level, 2);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create a view for products with calculated stock
CREATE OR REPLACE VIEW products_with_stock AS
SELECT 
    p.*,
    calculate_product_stock(p.id) as calculated_stock,
    (
        SELECT COUNT(*) 
        FROM "Transactions" t 
        WHERE t."productId" = p.id
    ) as transaction_count,
    (
        SELECT MAX(t."date") 
        FROM "Transactions" t 
        WHERE t."productId" = p.id
    ) as last_transaction_date
FROM "Products" p;

-- Step 4: Create a monthly consumption summary
CREATE OR REPLACE VIEW monthly_product_consumption AS
SELECT 
    p.id,
    p."artisCodes"[1] as artis_code,
    p.supplier,
    p.category,
    TO_CHAR(t."date", 'YYYY-MM') as month,
    SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as total_in,
    SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as total_out,
    SUM(CASE WHEN t.type = 'CORRECTION' THEN t.quantity ELSE 0 END) as total_corrections,
    calculate_product_stock(p.id) as current_stock
FROM "Products" p
LEFT JOIN "Transactions" t ON p.id = t."productId"
GROUP BY p.id, p."artisCodes", p.supplier, p.category, TO_CHAR(t."date", 'YYYY-MM')
ORDER BY p."artisCodes"[1], month DESC;

-- Step 5: Add trigger to update product's lastUpdated when transactions change
CREATE OR REPLACE FUNCTION update_product_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "Products"
    SET "lastUpdated" = NOW()
    WHERE id = COALESCE(NEW."productId", OLD."productId");
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_product_on_transaction ON "Transactions";
CREATE TRIGGER update_product_on_transaction
AFTER INSERT OR UPDATE OR DELETE ON "Transactions"
FOR EACH ROW
EXECUTE FUNCTION update_product_last_updated();