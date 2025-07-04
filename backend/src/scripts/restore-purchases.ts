import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function restorePurchases() {
  console.log('📦 Restoring purchases data from Test_Backup...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Get all data from Test_Backup
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Test_Backup!A2:D', // Skip header
    });
    
    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows to restore`);
    
    if (rows.length > 0) {
      // Clear Sheet1 (except header)
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
        range: 'Sheet1!A2:D1000',
      });
      
      // Write data to Sheet1
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows
        }
      });
      
      console.log('✅ Purchases data restored to Sheet1');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  restorePurchases().catch(console.error);
}

export { restorePurchases };