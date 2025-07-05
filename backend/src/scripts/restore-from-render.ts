import { Client } from 'pg';
import sequelize from '../config/sequelize';
import { Product } from '../models';
import * as dotenv from 'dotenv';

dotenv.config();

// Render database connection
const RENDER_DB_URL = 'postgresql://artis_db_user:exAc3fAFiKj4cKGJ9tFQzGGc7XIQawbV@dpg-ctk44gtds78s73et5hcg-a.singapore-postgres.render.com/artis_db';

async function restoreProductsFromRender() {
  console.log('🔄 Starting product restoration from Render database...\n');
  
  // Connect to Render database
  const renderClient = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Connect to Render
    console.log('📡 Connecting to Render database...');
    await renderClient.connect();
    console.log('✓ Connected to Render\n');
    
    // Get products from Render
    console.log('📦 Fetching products from Render...');
    const result = await renderClient.query(`
      SELECT 
        "artisCodes",
        name,
        "supplierCode",
        supplier,
        category,
        thickness,
        "currentStock",
        "avgConsumption"
      FROM "Products"
      ORDER BY "artisCodes"
    `);
    
    console.log(`✓ Found ${result.rows.length} products in Render database\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ No products found in Render database!');
      return;
    }
    
    // Connect to Supabase (local)
    console.log('📡 Connecting to Supabase...');
    await sequelize.authenticate();
    console.log('✓ Connected to Supabase\n');
    
    // Check current state
    const currentCount = await Product.count();
    console.log(`Current products in Supabase: ${currentCount}`);
    
    if (currentCount > 0 && !process.argv.includes('--force')) {
      console.log('\n⚠️  Products already exist in Supabase!');
      console.log('Use --force flag to overwrite');
      return;
    }
    
    if (currentCount > 0 && process.argv.includes('--force')) {
      console.log('\n🗑️  Clearing existing products...');
      await Product.destroy({ where: {} });
    }
    
    // Import products
    console.log('\n📥 Importing products to Supabase...');
    let imported = 0;
    let failed = 0;
    
    for (const row of result.rows) {
      try {
        await Product.create({
          artisCodes: row.artisCodes,
          name: row.name,
          supplierCode: row.supplierCode,
          supplier: row.supplier,
          category: row.category,
          thickness: row.thickness,
          currentStock: row.currentStock || 0,
          avgConsumption: row.avgConsumption || 0
        });
        imported++;
        
        if (imported % 10 === 0) {
          process.stdout.write(`\r✓ Imported ${imported}/${result.rows.length} products...`);
        }
      } catch (error: any) {
        failed++;
        console.error(`\n❌ Failed to import ${row.artisCodes}: ${error.message}`);
      }
    }
    
    console.log(`\n\n✅ Import complete!`);
    console.log(`- Imported: ${imported} products`);
    console.log(`- Failed: ${failed} products`);
    
    // Show sample products
    console.log('\n📊 Sample products:');
    const samples = await Product.findAll({ limit: 5 });
    samples.forEach(p => {
      console.log(`- ${p.artisCodes[0]}: ${p.name} (${p.category})`);
    });
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('connect')) {
      console.error('\nConnection tips:');
      console.error('- Check if you have network access');
      console.error('- Verify Render database is still active');
      console.error('- Try using a VPN if connection is blocked');
    }
  } finally {
    await renderClient.end();
    await sequelize.close();
  }
}

// Also create a function to just check Render
async function checkRenderDatabase() {
  console.log('🔍 Checking Render database...\n');
  
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✓ Connected to Render database\n');
    
    // First, list all tables
    console.log('📋 Available tables:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    console.log('');
    
    // Get counts - try both lowercase and PascalCase
    const tables = [
      { name: 'products', altName: 'Products' },
      { name: 'transactions', altName: 'Transactions' },
      { name: 'users', altName: 'Users' },
      { name: 'distributors', altName: 'Distributors' }
    ];
    
    for (const table of tables) {
      try {
        let result = await client.query(`SELECT COUNT(*) as count FROM "${table.name}"`);
        console.log(`${table.name}: ${result.rows[0].count} records`);
      } catch (error) {
        try {
          let result = await client.query(`SELECT COUNT(*) as count FROM "${table.altName}"`);
          console.log(`${table.altName}: ${result.rows[0].count} records`);
        } catch (error2) {
          console.log(`${table.name}/${table.altName}: not found`);
        }
      }
    }
    
    // Show sample products
    console.log('\n📦 Sample products from Render:');
    try {
      const products = await client.query(`
        SELECT "artisCodes", name, category, "currentStock" 
        FROM "Products" 
        LIMIT 5
      `);
    
      products.rows.forEach(p => {
        console.log(`- ${p.artisCodes[0]}: ${p.name} (${p.category}) - Stock: ${p.currentStock}`);
      });
    } catch (error: any) {
      console.log(`❌ Could not fetch products: ${error.message}`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check') {
    checkRenderDatabase().catch(console.error);
  } else {
    restoreProductsFromRender().catch(console.error);
  }
}

export { restoreProductsFromRender, checkRenderDatabase };