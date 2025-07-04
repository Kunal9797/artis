import { SheetsManagerService } from '../services/sheets-manager.service';
import { Product, Transaction } from '../models';
import sequelize from '../config/sequelize';
import * as dotenv from 'dotenv';
import { Op, QueryTypes } from 'sequelize';

dotenv.config();

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testAndMigrateGuide() {
  console.log(`\n${colors.bright}${colors.blue}🚀 ARTIS GOOGLE SHEETS TEST & MIGRATION GUIDE${colors.reset}\n`);

  const sheetsManager = new SheetsManagerService();

  try {
    // Step 1: Test Connection
    console.log(`${colors.yellow}📋 STEP 1: Testing Database & Google Sheets Connection${colors.reset}`);
    await sequelize.authenticate();
    console.log(`${colors.green}✅ Database connected successfully${colors.reset}`);
    
    const pending = await sheetsManager.getPendingSummary();
    console.log(`${colors.green}✅ Google Sheets connected successfully${colors.reset}`);
    console.log(`Current pending items:`, pending);
    
    // Step 2: Setup Templates
    console.log(`\n${colors.yellow}📋 STEP 2: Setting Up Sheet Templates${colors.reset}`);
    console.log('This will create templates in your Google Sheets...\n');
    
    // Setup each sheet
    const setupSteps = [
      { name: 'Consumption', method: () => sheetsManager.setupConsumptionSheet() },
      { name: 'Purchases', method: () => sheetsManager.setupPurchasesSheet() },
      { name: 'Corrections', method: () => sheetsManager.setupCorrectionsSheet() },
      { name: 'Initial Stock', method: () => sheetsManager.setupInitialStockSheet() }
    ];
    
    for (const step of setupSteps) {
      try {
        console.log(`Setting up ${step.name} sheet...`);
        await step.method();
        console.log(`${colors.green}✅ ${step.name} sheet ready${colors.reset}`);
      } catch (error: any) {
        console.log(`${colors.red}❌ Error setting up ${step.name}: ${error.message}${colors.reset}`);
      }
    }
    
    // Step 3: Show Current Data Summary
    console.log(`\n${colors.yellow}📋 STEP 3: Current Database Summary${colors.reset}`);
    
    const productCount = await Product.count();
    const transactionCount = await Transaction.count();
    const inTransactions = await Transaction.count({ where: { type: 'IN' } });
    const outTransactions = await Transaction.count({ where: { type: 'OUT' } });
    
    console.log(`\n${colors.cyan}Database Statistics:${colors.reset}`);
    console.log(`- Total Products: ${productCount}`);
    console.log(`- Total Transactions: ${transactionCount}`);
    console.log(`  - Purchases (IN): ${inTransactions}`);
    console.log(`  - Consumption (OUT): ${outTransactions}`);
    
    // Get date range
    const oldestTransaction = await Transaction.findOne({ order: [['date', 'ASC']] });
    const newestTransaction = await Transaction.findOne({ order: [['date', 'DESC']] });
    
    if (oldestTransaction && newestTransaction) {
      console.log(`\n${colors.cyan}Date Range:${colors.reset}`);
      console.log(`- Oldest: ${oldestTransaction.date.toLocaleDateString()}`);
      console.log(`- Newest: ${newestTransaction.date.toLocaleDateString()}`);
    }
    
    // Step 4: Testing Instructions
    console.log(`\n${colors.yellow}📋 STEP 4: How to Test the System${colors.reset}`);
    console.log(`
${colors.bright}A. Test Initial Stock:${colors.reset}
1. Open Initial Stock sheet: ${colors.blue}https://docs.google.com/spreadsheets/d/1jS87QQ0eoVNQF9ymrRhiROU_oEyW-1zhnN382EX1Abs${colors.reset}
2. You'll see all products with their current stock
3. Enter a test initial stock value (e.g., 1000) for product 101
4. Go to app > Google Sheets Sync > Click "Sync" on Initial Stock card
5. Check if the sync was successful

${colors.bright}B. Test Consumption:${colors.reset}
1. Open Consumption sheet: ${colors.blue}https://docs.google.com/spreadsheets/d/1hwS0u_Mcf7795WeMlX3Eez7j0J4ikR8JCz19nJvisJU${colors.reset}
2. Enter test consumption (e.g., 50 kg for product 101)
3. Sync and verify

${colors.bright}C. Test Purchases:${colors.reset}
1. Open Purchases sheet: ${colors.blue}https://docs.google.com/spreadsheets/d/1gPOqkdU6NpOC0yx6Q-tx2PZs54VDyrbip5kTUJQ13Tw${colors.reset}
2. Enter a test purchase (e.g., 101, 2025-01-15, 200, Test Supplier)
3. Sync and verify

${colors.bright}D. Test Corrections:${colors.reset}
1. Open Corrections sheet: ${colors.blue}https://docs.google.com/spreadsheets/d/1WxtUXZC4XT7K5TX--rUivk7g0tT4WCBwc7tbyksKT3w${colors.reset}
2. Enter a correction (e.g., 101, +25, Stock Adjustment)
3. Sync and verify
`);
    
    // Step 5: Migration Options
    console.log(`\n${colors.yellow}📋 STEP 5: Data Migration Options${colors.reset}`);
    console.log(`
${colors.bright}Option 1: Export Current Data to CSV (Recommended)${colors.reset}
Run: ${colors.cyan}npm run export-for-sheets${colors.reset}
This will create CSV files you can copy-paste into Google Sheets

${colors.bright}Option 2: Manual Migration${colors.reset}
1. Export transactions grouped by month
2. Copy consumption totals to Consumption sheet
3. Copy individual purchases to Purchases sheet

${colors.bright}Option 3: Automated Migration${colors.reset}
Run: ${colors.cyan}npm run migrate-to-sheets${colors.reset}
This will automatically populate your Google Sheets with existing data
`);

    // Show what data needs migration
    console.log(`\n${colors.yellow}📋 Data to Migrate:${colors.reset}`);
    
    // Get monthly consumption summary
    const consumptionByMonth = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', date) as month,
        COUNT(DISTINCT "productId") as products,
        SUM(quantity) as total_quantity
      FROM "Transactions"
      WHERE type = 'OUT'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
      LIMIT 6
    `, { type: QueryTypes.SELECT });
    
    console.log(`\n${colors.cyan}Recent Consumption (by month):${colors.reset}`);
    for (const month of consumptionByMonth as any[]) {
      const monthStr = new Date(month.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      console.log(`- ${monthStr}: ${month.products} products, ${parseFloat(month.total_quantity).toFixed(2)} kg total`);
    }
    
    // Get recent purchases
    const recentPurchases = await Transaction.count({
      where: {
        type: 'IN',
        date: {
          [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3))
        }
      }
    });
    
    console.log(`\n${colors.cyan}Recent Purchases:${colors.reset}`);
    console.log(`- Last 3 months: ${recentPurchases} transactions`);
    
    console.log(`\n${colors.green}✅ Testing guide complete!${colors.reset}`);
    console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
    console.log('1. Test each sheet type with small data');
    console.log('2. Once confident, run migration');
    console.log('3. Verify migrated data');
    console.log('4. Upload June 2025 data');
    
  } catch (error: any) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  testAndMigrateGuide().catch(console.error);
}

export { testAndMigrateGuide };