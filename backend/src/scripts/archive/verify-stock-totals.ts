import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyStockTotals() {
  console.log('🔍 Verifying stock totals...\n');
  
  try {
    await sequelize.authenticate();
    
    // 1. Check transaction totals by type
    const transactionTotals = await sequelize.query(
      `SELECT 
        type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM "Transactions"
      GROUP BY type
      ORDER BY type`,
      { type: QueryTypes.SELECT }
    );
    
    console.log('📊 Transaction Summary by Type:');
    (transactionTotals as any[]).forEach(row => {
      console.log(`- ${row.type}: ${row.count} transactions, ${parseFloat(row.total_quantity).toFixed(2)} kg total`);
    });
    
    // 2. Calculate expected stock (IN - OUT)
    const stockCalc = await sequelize.query(
      `SELECT 
        SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN type = 'OUT' THEN -quantity ELSE 0 END) as total_out,
        SUM(CASE WHEN type = 'CORRECTION' THEN quantity ELSE 0 END) as total_corrections
      FROM "Transactions"`,
      { type: QueryTypes.SELECT }
    );
    
    const calc = stockCalc[0] as any;
    const expectedStock = parseFloat(calc.total_in) + parseFloat(calc.total_out) + parseFloat(calc.total_corrections);
    
    console.log(`\n📈 Stock Calculation:`);
    console.log(`- Total IN: ${parseFloat(calc.total_in).toFixed(2)} kg`);
    console.log(`- Total OUT: ${parseFloat(calc.total_out).toFixed(2)} kg`);
    console.log(`- Total CORRECTIONS: ${parseFloat(calc.total_corrections).toFixed(2)} kg`);
    console.log(`- Expected Total Stock: ${expectedStock.toFixed(2)} kg`);
    
    // 3. Check actual product stock totals
    const productTotals = await sequelize.query(
      `SELECT 
        SUM("currentStock") as total_stock,
        COUNT(*) as product_count
      FROM "Products"`,
      { type: QueryTypes.SELECT }
    );
    
    const productTotal = productTotals[0] as any;
    console.log(`\n📦 Product Stock Summary:`);
    console.log(`- Total Products: ${productTotal.product_count}`);
    console.log(`- Total Stock in Products table: ${parseFloat(productTotal.total_stock).toFixed(2)} kg`);
    
    // 4. Sample corrections to see what's happening
    console.log(`\n🔧 Recent Corrections (last 5):`);
    const recentCorrections = await sequelize.query(
      `SELECT 
        t."type",
        t."quantity",
        t."date",
        t."notes",
        p."artisCodes"
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p."id"
      WHERE t."notes" LIKE 'CORRECTION:%'
      ORDER BY t."createdAt" DESC
      LIMIT 5`,
      { type: QueryTypes.SELECT }
    );
    
    (recentCorrections as any[]).forEach(corr => {
      console.log(`- ${corr.artisCodes[0]}: ${corr.type} ${corr.quantity} kg - ${corr.notes}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  verifyStockTotals().catch(console.error);
}

export { verifyStockTotals };