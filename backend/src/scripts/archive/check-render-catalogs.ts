import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const RENDER_DB_URL = 'postgresql://artis_db_user:exAc3fAFiKj4cKGJ9tFQzGGc7XIQawbV@dpg-ctk44gtds78s73et5hcg-a.singapore-postgres.render.com/artis_db';

async function checkRenderCatalogs() {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✓ Connected to Render database\n');
    
    // Check columns in Products table
    console.log('📋 Products table structure:');
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Products'
      ORDER BY ordinal_position
    `);
    
    columnsResult.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if catalogs column exists and has data
    console.log('\n📦 Checking catalogs data:');
    const catalogsResult = await client.query(`
      SELECT "artisCodes", name, catalogs
      FROM "Products"
      WHERE catalogs IS NOT NULL AND catalogs != '{}'
      LIMIT 10
    `);
    
    if (catalogsResult.rows.length > 0) {
      console.log(`Found ${catalogsResult.rows.length} products with catalogs:`);
      catalogsResult.rows.forEach(p => {
        console.log(`- ${p.artisCodes[0]}: ${p.catalogs}`);
      });
    } else {
      console.log('No products have catalog data in Render database');
    }
    
    // Check all products to see catalog pattern
    const allProductsResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN catalogs IS NOT NULL AND catalogs != '{}' THEN 1 END) as with_catalogs
      FROM "Products"
    `);
    
    console.log(`\nTotal products: ${allProductsResult.rows[0].total}`);
    console.log(`Products with catalogs: ${allProductsResult.rows[0].with_catalogs}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkRenderCatalogs().catch(console.error);