import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function clearAllSheets() {
  console.log('🧹 Clearing all Google Sheets data...\n');
  console.log('⚠️  This will remove all data from the sheets (keeping headers).\n');

  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetsToClear = [
    { name: 'Consumption', id: process.env.GOOGLE_SHEETS_CONSUMPTION_ID },
    { name: 'Purchases', id: process.env.GOOGLE_SHEETS_PURCHASES_ID },
    { name: 'Corrections', id: process.env.GOOGLE_SHEETS_CORRECTIONS_ID },
    { name: 'Initial Stock', id: process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID }
  ];

  for (const sheet of sheetsToClear) {
    try {
      console.log(`Clearing ${sheet.name} sheet...`);
      
      // Clear all data rows (keep header in row 1)
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheet.id!,
        range: 'Sheet1!A2:Z10000',
      });
      
      console.log(`✅ ${sheet.name} sheet cleared`);
    } catch (error: any) {
      console.error(`❌ Error clearing ${sheet.name}: ${error.message}`);
    }
  }

  console.log('\n✅ All sheets cleared!');
  console.log('\nNext steps:');
  console.log('1. Run templates setup: npm run test-guide');
  console.log('2. Or start entering June 2025 data manually');
  console.log('3. Or run migration: npm run auto-migrate-to-sheets');
}

if (require.main === module) {
  clearAllSheets().catch(console.error);
}

export { clearAllSheets };