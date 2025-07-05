import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkBackupSheet() {
  console.log('🔍 Checking Test_Backup sheet...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Get data from Test_Backup sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Test_Backup!A:D',
    });
    
    const rows = response.data.values || [];
    console.log(`Total rows in Test_Backup: ${rows.length}`);
    
    // Show first 5 rows
    console.log('\nFirst 5 rows:');
    rows.slice(0, 5).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  checkBackupSheet().catch(console.error);
}

export { checkBackupSheet };