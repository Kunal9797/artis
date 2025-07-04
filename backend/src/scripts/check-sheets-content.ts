import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSheetsContent() {
  console.log('📊 Checking current Google Sheets content...\n');

  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetsToCheck = [
    { name: 'Consumption', id: process.env.GOOGLE_SHEETS_CONSUMPTION_ID },
    { name: 'Purchases', id: process.env.GOOGLE_SHEETS_PURCHASES_ID },
    { name: 'Corrections', id: process.env.GOOGLE_SHEETS_CORRECTIONS_ID },
    { name: 'Initial Stock', id: process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID }
  ];

  for (const sheet of sheetsToCheck) {
    console.log(`\n📋 ${sheet.name} Sheet:`);
    console.log(`URL: https://docs.google.com/spreadsheets/d/${sheet.id}/edit`);
    
    try {
      // Get first 5 rows to see what's there
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheet.id!,
        range: 'Sheet1!A1:E5',
      });

      const rows = response.data.values || [];
      console.log(`Total rows in view: ${rows.length}`);
      
      if (rows.length > 0) {
        console.log('First few rows:');
        rows.forEach((row, index) => {
          console.log(`Row ${index + 1}: ${row.slice(0, 3).join(' | ')}`);
        });
      }

      // Get count of data rows (excluding header)
      const countResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheet.id!,
        range: 'Sheet1!A2:A',
      });
      
      const dataRows = (countResponse.data.values || []).filter(row => 
        row[0] && !row[0].includes('Example:') && !row[0].includes('Instructions:')
      );
      
      console.log(`Data rows (excluding header/examples): ${dataRows.length}`);

    } catch (error: any) {
      console.error(`Error reading ${sheet.name}: ${error.message}`);
    }
  }

  console.log('\n\n🤔 What would you like to do?');
  console.log('1. Clear all sheets and start fresh:');
  console.log('   npm run clear-all-sheets\n');
  console.log('2. Export current database data to CSV:');
  console.log('   npm run export-for-sheets\n');
  console.log('3. Auto-migrate recent data (will append to existing):');
  console.log('   npm run auto-migrate-to-sheets\n');
  console.log('4. Proceed with testing using current data in sheets');
}

if (require.main === module) {
  checkSheetsContent().catch(console.error);
}

export { checkSheetsContent };