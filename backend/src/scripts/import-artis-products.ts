import sequelize from '../config/sequelize';
import { Product } from '../models';
import { Op } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface ProductData {
  artisCode: string;
  designName: string;
  supplierCode: string;
  supplier: string;
  category: string;
  catalog: string;
}

async function importArtisProducts() {
  console.log('🔄 Starting Artis 1mm products import...\n');
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');
    
    // Read CSV file
    const csvPath = '/Users/kunal/Downloads/Artis 1mm design additions - Sheet1.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Skip header row
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    console.log(`📦 Found ${dataLines.length} products to import\n`);
    
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const line of dataLines) {
      // Parse CSV line
      const parts = line.split(',');
      if (parts.length < 7) {
        console.log(`⚠️  Skipping invalid line: ${line}`);
        skipped++;
        continue;
      }
      
      const productData: ProductData = {
        artisCode: parts[1].trim(),
        designName: parts[2].trim(),
        supplierCode: parts[3].trim(),
        supplier: parts[4].trim(),
        category: parts[5].trim(),
        catalog: parts[6].trim()
      };
      
      try {
        // Check if product already exists
        const existing = await Product.findOne({
          where: {
            supplierCode: productData.supplierCode,
            supplier: productData.supplier
          }
        });
        
        if (existing) {
          console.log(`⚠️  Product ${productData.artisCode} already exists, skipping...`);
          skipped++;
          continue;
        }
        
        // Create new product
        await Product.create({
          artisCodes: [productData.artisCode],
          name: productData.designName,
          supplierCode: productData.supplierCode,
          supplier: productData.supplier,
          category: productData.category,
          catalogs: [productData.catalog],
          currentStock: 0,
          avgConsumption: 0,
          thickness: '1.0', // All Artis products are 1mm
          lastUpdated: new Date()
        });
        
        successful++;
        console.log(`✓ Created product ${productData.artisCode}: ${productData.designName}`);
        
      } catch (error: any) {
        failed++;
        const errorMsg = `❌ Failed to create ${productData.artisCode}: ${error.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${successful} products`);
    console.log(`⚠️  Skipped (already exist): ${skipped} products`);
    console.log(`❌ Failed: ${failed} products`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => console.log(err));
    }
    
    // Verify total count
    const totalProducts = await Product.count({
      where: { deletedAt: null }
    });
    console.log(`\n📦 Total products in database: ${totalProducts}`);
    
    // Show sample of imported products
    if (successful > 0) {
      console.log('\n📋 Sample of imported products:');
      const samples = await Product.findAll({
        where: {
          catalogs: { [Op.contains]: ['Artis'] }
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      
      samples.forEach(p => {
        console.log(`  - ${p.artisCodes[0]}: ${p.name} (${p.supplier})`);
      });
    }
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run the import
if (require.main === module) {
  importArtisProducts().catch(console.error);
}

export { importArtisProducts };