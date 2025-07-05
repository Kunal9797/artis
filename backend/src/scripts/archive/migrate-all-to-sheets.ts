import { google } from 'googleapis';
import { Product, Transaction } from '../models';
import sequelize from '../config/sequelize';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Op, QueryTypes } from 'sequelize';

dotenv.config();

async function migrateAllToSheets() {
  console.log('🚀 Migrating ALL data to Google Sheets...\n');
  console.log('This will migrate your complete database to sheets for verification.\n');
  
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
    console.log('✅ Connected to database\n');
    
    // 1. Migrate ALL Consumption Data (grouped by month)
    console.log('📊 Migrating ALL consumption data...');
    const consumptionData = await sequelize.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        DATE_TRUNC('month', t.date) as month,
        SUM(t.quantity) as total_consumption
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p.id
      WHERE t.type = 'OUT'
      GROUP BY p.id, p."artisCodes", DATE_TRUNC('month', t.date)
      ORDER BY month, artis_code
    `, { type: QueryTypes.SELECT });
    
    // Convert to sheet format
    const consumptionRows = (consumptionData as any[]).map(row => [
      row.artis_code,
      parseFloat(row.total_consumption).toFixed(2),
      new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      'Historical data'
    ]);
    
    if (consumptionRows.length > 0) {
      // Add header first
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { 
          values: [['Artis Code', 'Consumption (kg)', 'Month', 'Notes']]
        }
      });
      
      // Add data
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: consumptionRows }
      });
      console.log(`✅ Migrated ${consumptionRows.length} consumption records`);
    }
    
    // 2. Migrate ALL Purchase Transactions
    console.log('\n📊 Migrating ALL purchase transactions...');
    const purchasesData = await sequelize.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        t.date,
        t.quantity,
        t.notes
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p.id
      WHERE t.type = 'IN'
      ORDER BY t.date ASC
    `, { type: QueryTypes.SELECT });
    
    const purchaseRows = (purchasesData as any[]).map(row => [
      row.artis_code || '',
      new Date(row.date).toISOString().split('T')[0],
      parseFloat(row.quantity).toFixed(2),
      row.notes || 'Historical data'
    ]);
    
    if (purchaseRows.length > 0) {
      // Add header
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { 
          values: [['Artis Code', 'Date', 'Amount (kg)', 'Notes']]
        }
      });
      
      // Add data in batches (Google Sheets has limits)
      const batchSize = 500;
      for (let i = 0; i < purchaseRows.length; i += batchSize) {
        const batch = purchaseRows.slice(i, i + batchSize);
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
          range: 'Sheet1!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: batch }
        });
        console.log(`  Processed ${Math.min(i + batchSize, purchaseRows.length)}/${purchaseRows.length} purchases...`);
      }
      console.log(`✅ Migrated ${purchaseRows.length} purchase transactions`);
    }
    
    // 3. Migrate Current Stock Values
    console.log('\n📊 Migrating current stock values...');
    const products = await Product.findAll({
      attributes: ['artisCodes', 'currentStock'],
      order: [['artisCodes', 'ASC']]
    });
    
    const stockRows = products.map(p => [
      p.artisCodes[0] || '',
      '', // Leave initial stock empty
      new Date().toISOString().split('T')[0], // Today's date
      'Set initial stock value'
    ]);
    
    if (stockRows.length > 0) {
      // Add header
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID!,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { 
          values: [['Artis Code', 'Initial Stock (kg)', 'Date', 'Notes']]
        }
      });
      
      // Add data
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: stockRows }
      });
      console.log(`✅ Migrated ${stockRows.length} product stock values`);
    }
    
    // 4. Create Verification Summary
    console.log('\n📊 Creating verification summary...');
    
    // Get totals from database
    const totalConsumption = await sequelize.query(`
      SELECT SUM(quantity) as total
      FROM "Transactions"
      WHERE type = 'OUT'
    `, { type: QueryTypes.SELECT });
    
    const totalPurchases = await sequelize.query(`
      SELECT SUM(quantity) as total
      FROM "Transactions"
      WHERE type = 'IN'
    `, { type: QueryTypes.SELECT });
    
    const monthlyBreakdown = await sequelize.query(`
      SELECT 
        DATE_TRUNC('month', date) as month,
        type,
        COUNT(*) as count,
        SUM(quantity) as total
      FROM "Transactions"
      GROUP BY DATE_TRUNC('month', date), type
      ORDER BY month DESC
    `, { type: QueryTypes.SELECT });
    
    console.log('\n✅ Migration Complete!');
    console.log('\n📋 Database Summary:');
    console.log(`- Total Consumption: ${parseFloat((totalConsumption as any)[0].total).toFixed(2)} kg`);
    console.log(`- Total Purchases: ${parseFloat((totalPurchases as any)[0].total).toFixed(2)} kg`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Transactions: ${purchaseRows.length + consumptionRows.length}`);
    
    console.log('\n📋 Monthly Breakdown:');
    (monthlyBreakdown as any[]).forEach(row => {
      const monthStr = new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      console.log(`- ${monthStr} ${row.type}: ${row.count} transactions, ${parseFloat(row.total).toFixed(2)} kg`);
    });
    
    console.log('\n⚠️  IMPORTANT VERIFICATION STEPS:');
    console.log('1. DO NOT sync these sheets back to database - data is already there!');
    console.log('2. Open each sheet and verify totals match the summary above');
    console.log('3. Check a few random products to ensure data is correct');
    console.log('4. Once verified, you can add June 2025 data to the sheets');
    console.log('\n📊 Sheet URLs:');
    console.log(`Consumption: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_CONSUMPTION_ID}/edit`);
    console.log(`Purchases: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_PURCHASES_ID}/edit`);
    console.log(`Stock: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID}/edit`);
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  migrateAllToSheets().catch(console.error);
}

export { migrateAllToSheets };