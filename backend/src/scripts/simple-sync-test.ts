import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function simpleSyncTest() {
  console.log('📊 Simple Sync Test\n');
  
  try {
    await sequelize.authenticate();
    
    // Check current state
    const stats = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Transactions" WHERE type = 'OUT') as consumption_count,
        (SELECT COUNT(*) FROM "Transactions" WHERE type = 'IN') as purchase_count,
        (SELECT COUNT(*) FROM "Transactions" WHERE type = 'CORRECTION') as correction_count,
        (SELECT COUNT(*) FROM "Products") as product_count
    `, { type: QueryTypes.SELECT }) as any[];
    
    console.log('Current Database State:');
    console.log('======================');
    console.log(`Products: ${stats[0].product_count}`);
    console.log(`Consumption: ${stats[0].consumption_count} transactions`);
    console.log(`Purchases: ${stats[0].purchase_count} transactions`);
    console.log(`Corrections: ${stats[0].correction_count} transactions`);
    console.log('');
    
    console.log('Expected After Full Sync:');
    console.log('========================');
    console.log('Products: 235');
    console.log('Consumption: 1,230 transactions');
    console.log('Purchases: 486 transactions');
    console.log('Corrections: 15 transactions');
    console.log('');
    
    console.log('Status:');
    console.log('=======');
    const consStatus = stats[0].consumption_count > 1230 ? '⚠️ Has duplicates' : 
                      stats[0].consumption_count === 1230 ? '✅ Complete' : 
                      '❌ Incomplete';
    const purchStatus = stats[0].purchase_count === 486 ? '✅ Complete' : '❌ Incomplete';
    const corrStatus = stats[0].correction_count === 15 ? '✅ Complete' : '❌ Incomplete';
    
    console.log(`Consumption: ${consStatus}`);
    console.log(`Purchases: ${purchStatus}`);
    console.log(`Corrections: ${corrStatus}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  simpleSyncTest().catch(console.error);
}

export { simpleSyncTest };