import { Transaction } from '../models';
import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixConsumptionTransactions() {
  console.log('🔧 Fixing consumption transactions...\n');
  
  try {
    await sequelize.authenticate();
    
    // Update all OUT transactions to have includeInAvg = true
    const [updatedRows] = await sequelize.query(
      `UPDATE "Transactions" 
       SET "includeInAvg" = true 
       WHERE type = 'OUT' 
       AND "includeInAvg" = false`,
      { type: QueryTypes.UPDATE }
    );
    
    console.log(`✅ Updated ${updatedRows} consumption transactions to include in average calculation\n`);
    
    // Now recalculate averages
    console.log('📊 Recalculating average consumption...');
    
    const products = await sequelize.query(
      `SELECT DISTINCT "productId" FROM "Transactions" WHERE type = 'OUT'`,
      { type: QueryTypes.SELECT }
    );
    
    for (const row of products as any[]) {
      const avgResult = await sequelize.query(
        `SELECT 
          COUNT(DISTINCT DATE_TRUNC('month', date)) as months,
          COALESCE(SUM(quantity), 0) as total_consumption
        FROM "Transactions"
        WHERE "productId" = :productId
          AND type = 'OUT'
          AND "includeInAvg" = true`,
        {
          replacements: { productId: row.productId },
          type: QueryTypes.SELECT
        }
      );
      
      const months = parseInt((avgResult as any)[0].months) || 1;
      const totalConsumption = parseFloat((avgResult as any)[0].total_consumption) || 0;
      const avgConsumption = totalConsumption / months;
      
      await sequelize.query(
        `UPDATE "Products" 
         SET "avgConsumption" = :avgConsumption
         WHERE "id" = :productId`,
        {
          replacements: { avgConsumption, productId: row.productId },
          type: QueryTypes.UPDATE
        }
      );
    }
    
    // Get summary
    const totalAvgResult = await sequelize.query(
      `SELECT SUM("avgConsumption") as total FROM "Products"`,
      { type: QueryTypes.SELECT }
    );
    
    console.log(`\n✅ Fixed consumption transactions!`);
    console.log(`📊 Total average consumption across all products: ${parseFloat((totalAvgResult as any)[0].total).toFixed(2)} kg/month`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  fixConsumptionTransactions().catch(console.error);
}

export { fixConsumptionTransactions };