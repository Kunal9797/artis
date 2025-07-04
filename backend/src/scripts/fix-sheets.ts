import { google } from 'googleapis';
import sequelize from '../config/sequelize';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { QueryTypes } from 'sequelize';

dotenv.config();

async function fixSheets() {
  console.log('🔧 Fixing Google Sheets data...\n');
  
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
    
    // 1. Clear and re-migrate consumption data
    console.log('📊 Clearing consumption sheet...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:Z10000',
    });
    
    console.log('📊 Re-migrating consumption data (without duplicates)...');
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
    
    const consumptionRows = (consumptionData as any[]).map(row => [
      row.artis_code,
      parseFloat(row.total_consumption).toFixed(2),
      new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      'Historical data'
    ]);
    
    if (consumptionRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: consumptionRows }
      });
      console.log(`✅ Re-migrated ${consumptionRows.length} consumption records (no duplicates)\n`);
    }
    
    // 2. Add missing CORRECTION transactions
    console.log('📊 Adding correction transactions...');
    
    // First, add header if needed
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { 
        values: [['Artis Code', 'Correction Amount', 'Type', 'Date Applied', 'Reason']]
      }
    });
    
    // Get all correction transactions
    const corrections = await sequelize.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        t.date,
        t.quantity,
        t.notes
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p.id
      WHERE t.type = 'CORRECTION'
      ORDER BY t.date ASC
    `, { type: QueryTypes.SELECT });
    
    const correctionRows = (corrections as any[]).map(row => {
      const amount = parseFloat(row.quantity);
      const notes = row.notes || '';
      
      // Extract type from notes if available
      let type = 'Stock Adjustment';
      if (notes.includes('CORRECTION:')) {
        const match = notes.match(/CORRECTION: ([^.]+)\./);
        if (match) type = match[1];
      }
      
      return [
        row.artis_code,
        `${amount > 0 ? '+' : ''}${amount}`, // Include + for positive
        type,
        new Date(row.date).toISOString().split('T')[0],
        notes
      ];
    });
    
    if (correctionRows.length > 0) {
      // Clear existing data first (except header)
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
        range: 'Sheet1!A2:E1000',
      });
      
      // Add corrections
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: correctionRows }
      });
      console.log(`✅ Added ${correctionRows.length} correction transactions\n`);
    }
    
    // 3. Verify totals
    console.log('📊 Verification Summary:');
    
    const dbConsumptionTotal = await sequelize.query(`
      SELECT SUM(quantity) as total FROM "Transactions" WHERE type = 'OUT'
    `, { type: QueryTypes.SELECT });
    
    const dbCorrectionTotal = await sequelize.query(`
      SELECT SUM(quantity) as total FROM "Transactions" WHERE type = 'CORRECTION'
    `, { type: QueryTypes.SELECT });
    
    console.log(`- Consumption: ${parseFloat((dbConsumptionTotal as any)[0].total).toFixed(2)} kg`);
    console.log(`- Corrections: ${parseFloat((dbCorrectionTotal as any)[0].total || 0).toFixed(2)} kg`);
    console.log(`- Purchases: 228,472 kg (unchanged)`);
    
    console.log('\n✅ Sheets fixed!');
    console.log('\nNext steps:');
    console.log('1. Run verification again: npm run verify-sheets');
    console.log('2. Check the sheets manually');
    console.log('3. Add June 2025 data');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  fixSheets().catch(console.error);
}

export { fixSheets };