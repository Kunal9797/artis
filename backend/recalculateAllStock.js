const { Client } = require('pg');
const dotenv = require('dotenv');

// Load Supabase environment
dotenv.config({ path: '.env.supabase' });

async function recalculateAllStock() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase');

    // Get all products with transactions
    const productsResult = await client.query(`
      SELECT DISTINCT p.id, p."artisCodes"[1] as artis_code
      FROM "Products" p
      INNER JOIN "Transactions" t ON t."productId" = p.id
    `);

    console.log(`Found ${productsResult.rows.length} products with transactions`);

    let updated = 0;
    for (const product of productsResult.rows) {
      // Calculate current stock
      const stockResult = await client.query(`
        SELECT COALESCE(SUM(
          CASE 
            WHEN type = 'IN' THEN quantity
            WHEN type = 'OUT' THEN -quantity
            WHEN type = 'CORRECTION' THEN quantity
          END
        ), 0) as total_stock
        FROM "Transactions"
        WHERE "productId" = $1
      `, [product.id]);

      const currentStock = parseFloat(stockResult.rows[0].total_stock) || 0;

      // Calculate average consumption
      const avgResult = await client.query(`
        SELECT COALESCE(AVG(quantity), 0) as avg_consumption
        FROM "Transactions"
        WHERE "productId" = $1
          AND type = 'OUT'
          AND "includeInAvg" = true
          AND date >= CURRENT_DATE - INTERVAL '12 months'
      `, [product.id]);

      const avgConsumption = parseFloat(avgResult.rows[0].avg_consumption) || 0;

      // Update product
      await client.query(`
        UPDATE "Products"
        SET 
          "currentStock" = $1,
          "avgConsumption" = $2,
          "lastUpdated" = NOW()
        WHERE id = $3
      `, [currentStock, avgConsumption, product.id]);

      updated++;
      
      if (updated % 25 === 0) {
        console.log(`Updated ${updated}/${productsResult.rows.length} products...`);
      }
    }

    console.log(`✅ Updated stock for ${updated} products`);

    // Show sample results
    const sampleResult = await client.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        p.supplier,
        p."currentStock",
        p."avgConsumption",
        (SELECT COUNT(*) FROM "Transactions" t WHERE t."productId" = p.id) as transaction_count
      FROM "Products" p
      WHERE p."currentStock" != 0
      ORDER BY p."currentStock" DESC
      LIMIT 10
    `);

    console.log('\nTop 10 products by stock:');
    console.table(sampleResult.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

console.log('🔄 Recalculating all product stock from transactions...\n');
recalculateAllStock();