import sequelize from '../config/sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function forceClearAll() {
  console.log('🗑️  Force clearing all inventory data...\n');
  console.log('⚠️  WARNING: This will delete ALL transactions and reset all product stocks!\n');
  
  try {
    await sequelize.authenticate();
    
    // Delete all transactions
    console.log('Deleting all transactions...');
    const deletedTrans = await sequelize.query(`DELETE FROM "Transactions"`);
    console.log('✅ Deleted all transactions');
    
    // Reset all product stocks to 0
    console.log('\nResetting all product stocks to 0...');
    await sequelize.query(`UPDATE "Products" SET "currentStock" = 0`);
    console.log('✅ Reset all product stocks');
    
    // Get final counts
    const counts = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Transactions") as transactions,
        (SELECT COUNT(*) FROM "Products") as products,
        (SELECT COUNT(*) FROM "Products" WHERE "currentStock" != 0) as non_zero_stock
    `);
    
    console.log('\n✅ Database cleared successfully!');
    console.log('Final state:', counts[0][0]);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  forceClearAll().catch(console.error);
}

export { forceClearAll };