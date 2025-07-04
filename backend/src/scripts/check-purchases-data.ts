import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkPurchasesData() {
  console.log('🔍 Checking Purchases sheet data...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A:D',
    });
    
    const rows = response.data.values || [];
    console.log(`Total rows in sheet: ${rows.length}`);
    
    // Show first 10 and last 10 rows
    console.log('\nFirst 10 rows:');
    rows.slice(0, 10).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
    
    if (rows.length > 10) {
      console.log('\n...\n\nLast 10 rows:');
      rows.slice(-10).forEach((row, index) => {
        console.log(`Row ${rows.length - 10 + index + 1}:`, row);
      });
    }
    
    // Check if there's an archive tab
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      fields: 'sheets.properties.title'
    });
    
    const sheetNames = sheetInfo.data.sheets?.map(sheet => sheet.properties?.title) || [];
    console.log('\nAvailable sheets:', sheetNames);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  checkPurchasesData().catch(console.error);
}

export { checkPurchasesData };