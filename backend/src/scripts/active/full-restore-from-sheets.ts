import { SheetsManagerOptimizedService } from '../../services/sheets-manager-optimized.service';
import sequelize from '../../config/sequelize';
import { Product, Transaction } from '../../models';
import { Op, QueryTypes } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function fullRestoreFromSheets() {
  console.log('🔄 Starting full restoration from Google Sheets...\n');
  
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');
    
    // Check current state
    const productCount = await Product.count();
    const transactionCount = await Transaction.count();
    
    console.log('Current database state:');
    console.log(`- Products: ${productCount}`);
    console.log(`- Transactions: ${transactionCount}\n`);
    
    if (productCount === 0) {
      console.log('❌ No products found in database!');
      console.log('Please restore products first. Options:');
      console.log('1. Import from Render database backup');
      console.log('2. Upload product master Excel file');
      console.log('3. Manually create products from Google Sheets data\n');
      
      console.log('The products should be created first before syncing transactions.');
      console.log('Products contain: artisCodes, name, supplier, category, thickness\n');
      
      process.exit(1);
    }
    
    console.log('✓ Products found. Proceeding with transaction sync...\n');
    
    const sheetsManager = new SheetsManagerOptimizedService();
    
    // Get pending counts
    console.log('Checking Google Sheets for pending data...');
    const pending = await sheetsManager.getPendingSummary();
    console.log('Pending data:');
    console.log(`- Consumption: ${pending.consumption} rows`);
    console.log(`- Purchases: ${pending.purchases} rows`);
    console.log(`- Corrections: ${pending.corrections} rows`);
    console.log(`- Initial Stock: ${pending.initialStock} rows\n`);
    
    // Sync in order
    if (pending.initialStock > 0) {
      console.log('📊 Syncing initial stock...');
      const result = await sheetsManager.syncInitialStock();
      console.log(`✓ Initial stock: Added ${result.added} records`);
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      }
      console.log('');
    }
    
    if (pending.purchases > 0) {
      console.log('📊 Syncing purchases...');
      const result = await sheetsManager.syncPurchases();
      console.log(`✓ Purchases: Added ${result.added} records`);
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      }
      console.log('');
    }
    
    if (pending.consumption > 0) {
      console.log('📊 Syncing consumption...');
      const result = await sheetsManager.syncConsumption();
      console.log(`✓ Consumption: Added ${result.added} records`);
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      }
      if ((result as any).warnings?.length > 0) {
        console.log(`⚠️  Warnings: ${(result as any).warnings.length}`);
      }
      console.log('');
    }
    
    if (pending.corrections > 0) {
      console.log('📊 Syncing corrections...');
      const result = await sheetsManager.syncCorrections();
      console.log(`✓ Corrections: Added ${result.added} records`);
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      }
      console.log('');
    }
    
    // Final summary
    const finalProductCount = await Product.count();
    const finalTransactionCount = await Transaction.count();
    
    console.log('\n✅ Restoration complete!');
    console.log('Final database state:');
    console.log(`- Products: ${finalProductCount}`);
    console.log(`- Transactions: ${finalTransactionCount}`);
    
    // Show some sample products with stock
    console.log('\nSample products with stock:');
    const sampleProducts = await Product.findAll({
      where: {
        currentStock: { [Op.gt]: 0 }
      },
      limit: 5,
      order: [['currentStock', 'DESC']]
    });
    
    sampleProducts.forEach(p => {
      console.log(`- ${p.artisCodes[0]}: ${p.currentStock} kg (avg: ${p.avgConsumption} kg/month)`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Add product check function
async function checkForProducts() {
  console.log('🔍 Checking for products in database...\n');
  
  try {
    await sequelize.authenticate();
    
    const productCount = await Product.count();
    
    if (productCount === 0) {
      console.log('❌ No products found!\n');
      console.log('To restore products, you need to:');
      console.log('1. Export products from Render database:');
      console.log('   - Connect to Render PostgreSQL');
      console.log('   - Export Products table');
      console.log('   - Import to Supabase\n');
      console.log('2. OR upload the product master Excel file');
      console.log('3. OR manually create products\n');
      
      console.log('Products table structure:');
      console.log('- id (UUID)');
      console.log('- artisCodes (array of strings)');
      console.log('- name');
      console.log('- supplierCode');
      console.log('- supplier');
      console.log('- category');
      console.log('- thickness');
      console.log('- currentStock (default: 0)');
      console.log('- avgConsumption (default: 0)\n');
    } else {
      console.log(`✓ Found ${productCount} products in database\n`);
      
      // Show categories
      const categories = await sequelize.query(
        'SELECT DISTINCT category, COUNT(*) as count FROM "Products" GROUP BY category',
        { type: QueryTypes.SELECT }
      );
      
      console.log('Product categories:');
      (categories as any[]).forEach(cat => {
        console.log(`- ${cat.category}: ${cat.count} products`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'check') {
    checkForProducts().catch(console.error);
  } else {
    fullRestoreFromSheets().catch(console.error);
  }
}

export { fullRestoreFromSheets, checkForProducts };