import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkPurchaseStructure() {
  console.log('🔍 Checking Purchases sheet structure...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Get header row
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A1:Z1',
    });
    
    console.log('Headers:', headerResponse.data.values?.[0]);
    
    // Get first few data rows
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:Z10',
    });
    
    const rows = dataResponse.data.values || [];
    console.log('\nFirst few data rows:');
    rows.forEach((row, index) => {
      console.log(`Row ${index + 2}:`, row);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  checkPurchaseStructure().catch(console.error);
}

export { checkPurchaseStructure };