import { Product, Transaction } from '../models';
import sequelize from '../config/sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearAllInventory() {
  console.log('⚠️  WARNING: This will clear all inventory data!');
  console.log('This includes:');
  console.log('- All transactions (purchases, consumption, corrections)');
  console.log('- All product stock levels will be reset to 0');
  console.log('- Average consumption will be reset to 0\n');
  
  // Add a 5-second delay to allow cancellation
  console.log('Starting in 5 seconds... Press Ctrl+C to cancel');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    // Start a transaction to ensure consistency
    const transaction = await sequelize.transaction();
    
    try {
      // 1. Delete all transactions
      console.log('🗑️  Deleting all transactions...');
      const deletedTransactions = await Transaction.destroy({
        where: {},
        transaction
      });
      console.log(`   Deleted ${deletedTransactions} transactions\n`);
      
      // 2. Reset all product stock levels and consumption
      console.log('📦 Resetting all product stock levels...');
      const [updatedProducts] = await sequelize.query(
        `UPDATE "Products" 
         SET "currentStock" = 0, 
             "avgConsumption" = 0,
             "updatedAt" = NOW()`,
        { transaction }
      );
      
      // Get count of products
      const productCount = await Product.count({ transaction });
      console.log(`   Reset stock levels for ${productCount} products\n`);
      
      // Commit the transaction
      await transaction.commit();
      
      console.log('✅ All inventory data has been cleared successfully!\n');
      console.log('Next steps:');
      console.log('1. Go to the Google Sheets Sync page in the admin dashboard');
      console.log('2. Upload your data to the respective Google Sheets');
      console.log('3. Click "Sync" for each data type');
      console.log('4. Run the verification script to compare the data\n');
      
      // Show summary of cleared data
      console.log('📊 Summary:');
      console.log(`- Transactions deleted: ${deletedTransactions}`);
      console.log(`- Products reset: ${productCount}`);
      console.log(`- All stock levels: 0 kg`);
      console.log(`- All consumption data: 0 kg\n`);
      
    } catch (error) {
      // Rollback the transaction on error
      await transaction.rollback();
      throw error;
    }
    
  } catch (error: any) {
    console.error('❌ Error clearing inventory:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  clearAllInventory().catch(console.error);
}

export { clearAllInventory };