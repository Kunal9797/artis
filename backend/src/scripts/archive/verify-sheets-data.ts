import { google } from 'googleapis';
import { Product, Transaction } from '../models';
import sequelize from '../config/sequelize';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { QueryTypes } from 'sequelize';

dotenv.config();

async function verifySheetsData() {
  console.log('🔍 Verifying Google Sheets data against Supabase...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    await sequelize.authenticate();
    
    // 1. Verify Consumption Totals
    console.log('📊 Verifying Consumption Data...');
    
    // Get from sheets
    const consumptionResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:C',
    });
    
    const sheetConsumptionRows = consumptionResponse.data.values || [];
    let sheetConsumptionTotal = 0;
    const sheetConsumptionByMonth: any = {};
    
    sheetConsumptionRows.forEach(row => {
      if (row[0] && row[1] && row[2]) {
        const amount = parseFloat(row[1]);
        const month = row[2];
        sheetConsumptionTotal += amount;
        
        if (!sheetConsumptionByMonth[month]) {
          sheetConsumptionByMonth[month] = 0;
        }
        sheetConsumptionByMonth[month] += amount;
      }
    });
    
    // Get from database
    const dbConsumptionTotal = await sequelize.query(`
      SELECT SUM(quantity) as total
      FROM "Transactions"
      WHERE type = 'OUT'
    `, { type: QueryTypes.SELECT });
    
    const dbTotal = parseFloat((dbConsumptionTotal as any)[0].total);
    
    console.log(`✅ Sheet Total: ${sheetConsumptionTotal.toFixed(2)} kg`);
    console.log(`✅ Database Total: ${dbTotal.toFixed(2)} kg`);
    console.log(`${Math.abs(sheetConsumptionTotal - dbTotal) < 0.01 ? '✅ MATCH!' : '❌ MISMATCH!'}\n`);
    
    // 2. Verify Purchase Totals
    console.log('📊 Verifying Purchase Data...');
    
    const purchaseResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:C',
    });
    
    const sheetPurchaseRows = purchaseResponse.data.values || [];
    let sheetPurchaseTotal = 0;
    let sheetPurchaseCount = 0;
    
    sheetPurchaseRows.forEach(row => {
      if (row[0] && row[2]) {
        sheetPurchaseTotal += parseFloat(row[2]);
        sheetPurchaseCount++;
      }
    });
    
    const dbPurchaseStats = await sequelize.query(`
      SELECT 
        COUNT(*) as count,
        SUM(quantity) as total
      FROM "Transactions"
      WHERE type = 'IN'
    `, { type: QueryTypes.SELECT });
    
    const dbPurchaseTotal = parseFloat((dbPurchaseStats as any)[0].total);
    const dbPurchaseCount = parseInt((dbPurchaseStats as any)[0].count);
    
    console.log(`✅ Sheet: ${sheetPurchaseCount} transactions, ${sheetPurchaseTotal.toFixed(2)} kg`);
    console.log(`✅ Database: ${dbPurchaseCount} transactions, ${dbPurchaseTotal.toFixed(2)} kg`);
    console.log(`${Math.abs(sheetPurchaseTotal - dbPurchaseTotal) < 0.01 ? '✅ MATCH!' : '❌ MISMATCH!'}\n`);
    
    // 3. Sample Product Verification
    console.log('📊 Verifying Sample Products...');
    
    const sampleProducts = ['101', '102', '103', '201', '202'];
    
    for (const artisCode of sampleProducts) {
      // Get from database
      const product = await Product.findOne({
        where: sequelize.where(
          sequelize.fn('array_to_string', sequelize.col('artisCodes'), ','),
          'LIKE',
          `%${artisCode}%`
        )
      });
      
      if (product) {
        const dbTransactions = await sequelize.query(`
          SELECT 
            type,
            SUM(quantity) as total
          FROM "Transactions"
          WHERE "productId" = :productId
          GROUP BY type
        `, { 
          replacements: { productId: product.id },
          type: QueryTypes.SELECT 
        });
        
        const purchases = (dbTransactions as any[]).find(t => t.type === 'IN')?.total || 0;
        const consumption = (dbTransactions as any[]).find(t => t.type === 'OUT')?.total || 0;
        
        console.log(`\nProduct ${artisCode}:`);
        console.log(`  Current Stock: ${product.currentStock} kg`);
        console.log(`  Total Purchases: ${parseFloat(purchases).toFixed(2)} kg`);
        console.log(`  Total Consumption: ${parseFloat(consumption).toFixed(2)} kg`);
        console.log(`  Calculated: ${(parseFloat(purchases) - parseFloat(consumption)).toFixed(2)} kg`);
      }
    }
    
    // 4. Monthly Summary Comparison
    console.log('\n📊 Monthly Summary:');
    
    const monthlyData = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', date) as month,
        type,
        COUNT(*) as transactions,
        SUM(quantity) as total
      FROM "Transactions"
      GROUP BY DATE_TRUNC('month', date), type
      ORDER BY month DESC
      LIMIT 10
    `, { type: QueryTypes.SELECT });
    
    console.log('\nRecent months from database:');
    (monthlyData as any[]).forEach(row => {
      const monthStr = new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      console.log(`${monthStr} - ${row.type}: ${row.transactions} transactions, ${parseFloat(row.total).toFixed(2)} kg`);
    });
    
    console.log('\n✅ Verification Complete!');
    console.log('\nNext steps:');
    console.log('1. Review the numbers above');
    console.log('2. Check the Google Sheets manually for any discrepancies');
    console.log('3. If everything matches, proceed with June 2025 data entry');
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  verifySheetsData().catch(console.error);
}

export { verifySheetsData };