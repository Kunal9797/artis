import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';

async function verifyClearedInventory() {
  try {
    await sequelize.authenticate();
    
    const transactionCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM "Transactions"', 
      { type: QueryTypes.SELECT }
    ) as any[];
    
    const stockSum = await sequelize.query(
      'SELECT SUM("currentStock") as total FROM "Products"', 
      { type: QueryTypes.SELECT }
    ) as any[];
    
    const consumptionSum = await sequelize.query(
      'SELECT SUM("avgConsumption") as total FROM "Products"', 
      { type: QueryTypes.SELECT }
    ) as any[];
    
    console.log('🔍 Verification Results:');
    console.log('- Total transactions:', transactionCount[0].count);
    console.log('- Total stock across all products:', stockSum[0].total || 0, 'kg');
    console.log('- Total average consumption:', consumptionSum[0].total || 0, 'kg');
    
    if (transactionCount[0].count === '0' && (!stockSum[0].total || stockSum[0].total === '0') && (!consumptionSum[0].total || consumptionSum[0].total === '0')) {
      console.log('\n✅ All inventory data has been successfully cleared!');
    } else {
      console.log('\n⚠️  Some data may not have been cleared properly.');
    }
    
  } catch (error: any) {
    console.error('❌ Error verifying:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  verifyClearedInventory().catch(console.error);
}

export { verifyClearedInventory };