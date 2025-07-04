import { Product, Transaction } from '../models';
import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function recalculateStockAndAvg() {
  console.log('🔄 Recalculating stock and average consumption for all products...\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    // Get all products
    const products = await Product.findAll();
    console.log(`Found ${products.length} products to update\n`);
    
    let updated = 0;
    
    for (const product of products) {
      // Calculate current stock from all transactions
      const stockResult = await sequelize.query(
        `SELECT COALESCE(SUM(
          CASE 
            WHEN type = 'IN' THEN quantity
            WHEN type = 'OUT' THEN -quantity
            WHEN type = 'CORRECTION' THEN quantity
          END
        ), 0) as total_stock
        FROM "Transactions"
        WHERE "productId" = :productId`,
        {
          replacements: { productId: product.id },
          type: QueryTypes.SELECT
        }
      );
      
      const currentStock = parseFloat((stockResult as any)[0].total_stock) || 0;
      
      // Calculate average monthly consumption
      const avgResult = await sequelize.query(
        `SELECT 
          COUNT(DISTINCT DATE_TRUNC('month', date)) as months,
          COALESCE(SUM(quantity), 0) as total_consumption
        FROM "Transactions"
        WHERE "productId" = :productId
          AND type = 'OUT'
          AND "includeInAvg" = true`,
        {
          replacements: { productId: product.id },
          type: QueryTypes.SELECT
        }
      );
      
      const months = parseInt((avgResult as any)[0].months) || 1;
      const totalConsumption = parseFloat((avgResult as any)[0].total_consumption) || 0;
      const avgConsumption = totalConsumption / months;
      
      // Update product
      await product.update({
        currentStock,
        avgConsumption
      });
      
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`Updated ${updated}/${products.length} products...`);
      }
    }
    
    // Get summary statistics
    const totalStockResult = await sequelize.query(
      `SELECT SUM("currentStock") as total FROM "Products"`,
      { type: QueryTypes.SELECT }
    );
    
    const totalAvgResult = await sequelize.query(
      `SELECT SUM("avgConsumption") as total FROM "Products"`,
      { type: QueryTypes.SELECT }
    );
    
    console.log(`\n✅ Updated ${updated} products successfully!\n`);
    console.log('📊 Summary:');
    console.log(`- Total stock across all products: ${parseFloat((totalStockResult as any)[0].total).toFixed(2)} kg`);
    console.log(`- Total average consumption: ${parseFloat((totalAvgResult as any)[0].total).toFixed(2)} kg/month`);
    
  } catch (error: any) {
    console.error('❌ Error recalculating stock:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  recalculateStockAndAvg().catch(console.error);
}

export { recalculateStockAndAvg };