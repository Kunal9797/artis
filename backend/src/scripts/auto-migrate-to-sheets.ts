import { google } from 'googleapis';
import { Product, Transaction } from '../models';
import sequelize from '../config/sequelize';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Op, QueryTypes } from 'sequelize';

dotenv.config();

async function autoMigrateToSheets() {
  console.log('🚀 Auto-migrating data to Google Sheets...\n');
  
  // Initialize Google Sheets API
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
    
    // Ask user what to migrate
    console.log('This will migrate your existing data to Google Sheets.');
    console.log('Make sure the sheets are empty or have only headers.\n');
    
    // 1. Migrate Current Stock to Initial Stock Sheet
    console.log('📊 Migrating current stock values...');
    const products = await Product.findAll({
      attributes: ['artisCodes', 'currentStock'],
      order: [['artisCodes', 'ASC']]
    });
    
    const stockData = products.map(p => [
      p.artisCodes[0] || '',
      p.currentStock || 0,
      p.currentStock || 0, // Set initial stock same as current
      'Migrated from database'
    ]);
    
    if (stockData.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: stockData }
      });
      console.log(`✅ Migrated ${stockData.length} product stock values`);
    }
    
    // 2. Migrate Last 3 Months Consumption
    console.log('\n📊 Migrating consumption data (last 3 months)...');
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const consumptionData = await sequelize.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        DATE_TRUNC('month', t.date) as month,
        SUM(t.quantity) as total_consumption
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p.id
      WHERE t.type = 'OUT' 
        AND t.date >= :startDate
      GROUP BY p.id, p."artisCodes", DATE_TRUNC('month', t.date)
      ORDER BY month DESC, artis_code
    `, { 
      replacements: { startDate: threeMonthsAgo },
      type: QueryTypes.SELECT 
    });
    
    const consumptionRows = (consumptionData as any[]).map(row => [
      row.artis_code,
      parseFloat(row.total_consumption).toFixed(2),
      new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      'Migrated data'
    ]);
    
    if (consumptionRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: consumptionRows }
      });
      console.log(`✅ Migrated ${consumptionRows.length} consumption records`);
    }
    
    // 3. Migrate Last 3 Months Purchases
    console.log('\n📊 Migrating purchase transactions (last 3 months)...');
    const purchases = await Transaction.findAll({
      where: { 
        type: 'IN',
        date: { [Op.gte]: threeMonthsAgo }
      },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['artisCodes']
      }],
      order: [['date', 'DESC']],
      limit: 100 // Limit to prevent overwhelming the sheet
    });
    
    const purchaseRows = purchases.map(p => {
      const notes = p.notes || '';
      const supplierMatch = notes.match(/Supplier: ([^.]+)/);
      const supplier = supplierMatch ? supplierMatch[1] : 'Unknown';
      
      return [
        (p as any).product?.artisCodes?.[0] || '',
        p.date.toISOString().split('T')[0],
        p.quantity.toFixed(2),
        supplier,
        notes
      ];
    });
    
    if (purchaseRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: purchaseRows }
      });
      console.log(`✅ Migrated ${purchaseRows.length} purchase transactions`);
    }
    
    // Summary
    console.log('\n✅ Migration Complete!');
    console.log('\n📋 What was migrated:');
    console.log(`- Current stock values for all products`);
    console.log(`- Consumption data for last 3 months`);
    console.log(`- Purchase transactions for last 3 months`);
    
    console.log('\n⚠️  IMPORTANT: Do NOT sync these sheets back to the database!');
    console.log('This data is already in the database. The sheets are now ready for NEW data entry.');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Review the migrated data in Google Sheets');
    console.log('2. Clear the sheets if you want to start fresh');
    console.log('3. Begin entering June 2025 data');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  autoMigrateToSheets().catch(console.error);
}

export { autoMigrateToSheets };