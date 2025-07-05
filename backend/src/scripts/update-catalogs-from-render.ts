import { Client } from 'pg';
import sequelize from '../config/sequelize';
import { Product } from '../models';
import { Op } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

const RENDER_DB_URL = 'postgresql://artis_db_user:exAc3fAFiKj4cKGJ9tFQzGGc7XIQawbV@dpg-ctk44gtds78s73et5hcg-a.singapore-postgres.render.com/artis_db';

async function updateCatalogsFromRender() {
  console.log('🔄 Starting catalog update from Render database...\n');
  
  const renderClient = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Connect to Render
    console.log('📡 Connecting to Render database...');
    await renderClient.connect();
    console.log('✓ Connected to Render\n');
    
    // Get products with catalogs from Render
    console.log('📦 Fetching products with catalogs from Render...');
    const result = await renderClient.query(`
      SELECT 
        "supplierCode",
        supplier,
        catalogs
      FROM "Products"
      WHERE catalogs IS NOT NULL AND catalogs != '{}'
      ORDER BY "supplierCode"
    `);
    
    console.log(`✓ Found ${result.rows.length} products with catalogs in Render\n`);
    
    // Connect to Supabase
    console.log('📡 Connecting to Supabase...');
    await sequelize.authenticate();
    console.log('✓ Connected to Supabase\n');
    
    // Update products
    console.log('📥 Updating catalogs in Supabase...');
    let updated = 0;
    let failed = 0;
    
    for (const row of result.rows) {
      try {
        const [updateCount] = await Product.update(
          { 
            catalogs: row.catalogs 
          },
          {
            where: {
              supplierCode: row.supplierCode,
              supplier: row.supplier
            }
          }
        );
        
        if (updateCount > 0) {
          updated++;
        }
        
        if (updated % 10 === 0) {
          process.stdout.write(`\r✓ Updated ${updated}/${result.rows.length} products...`);
        }
      } catch (error: any) {
        failed++;
        console.error(`\n❌ Failed to update ${row.supplierCode}: ${error.message}`);
      }
    }
    
    console.log(`\n\n✅ Update complete!`);
    console.log(`- Updated: ${updated} products`);
    console.log(`- Failed: ${failed} products`);
    
    // Verify update
    console.log('\n📊 Verifying catalog update:');
    const supabaseCount = await Product.count({
      where: {
        catalogs: {
          [Op.not]: null
        }
      }
    });
    
    console.log(`Products with catalogs in Supabase: ${supabaseCount}`);
    
    // Show sample products
    console.log('\n📦 Sample products with catalogs:');
    const samples = await Product.findAll({ 
      where: {
        catalogs: {
          [Op.not]: null
        }
      },
      limit: 5 
    });
    
    samples.forEach(p => {
      console.log(`- ${p.artisCodes[0]}: ${p.catalogs?.join(', ')}`);
    });
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await renderClient.end();
    await sequelize.close();
  }
}

updateCatalogsFromRender().catch(console.error);