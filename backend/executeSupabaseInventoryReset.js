const { Client } = require('pg');
const dotenv = require('dotenv');

// Load Supabase environment
dotenv.config({ path: '.env.supabase' });

async function resetInventorySystem() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase');

    // Step 1: Reset all product stock to 0
    console.log('Resetting product stock to 0...');
    const resetResult = await client.query(`
      UPDATE "Products" 
      SET "currentStock" = 0, 
          "avgConsumption" = 0,
          "lastUpdated" = NOW()
    `);
    console.log(`✅ Reset ${resetResult.rowCount} products`);

    // Step 2: Create stock calculation function
    console.log('Creating stock calculation function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_product_stock(product_id UUID)
      RETURNS NUMERIC AS $$
      DECLARE
          stock_level NUMERIC := 0;
      BEGIN
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
    `);
    console.log('✅ Created stock calculation function');

    // Step 3: Create products with stock view
    console.log('Creating products_with_stock view...');
    await client.query(`
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
    `);
    console.log('✅ Created products_with_stock view');

    // Step 4: Test the new system
    console.log('\nTesting the new system...');
    const testResult = await client.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN calculated_stock > 0 THEN 1 END) as products_with_stock,
        COUNT(CASE WHEN transaction_count > 0 THEN 1 END) as products_with_transactions
      FROM products_with_stock
    `);
    console.log('System status:', testResult.rows[0]);

    // Step 5: Show sample data
    const sampleResult = await client.query(`
      SELECT 
        "artisCodes"[1] as artis_code,
        supplier,
        calculated_stock,
        transaction_count
      FROM products_with_stock
      WHERE transaction_count > 0
      LIMIT 5
    `);
    console.log('\nSample products with transactions:');
    console.table(sampleResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

console.log('🔄 Resetting Inventory System to use Transaction-based calculations...\n');
resetInventorySystem();