import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function createInitialStockSheet() {
  console.log('📊 Creating Initial Stock Google Sheet...\n');

  // Initialize Google Sheets API
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  try {
    // Create new spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'Artis Initial Stock',
        },
        sheets: [{
          properties: {
            title: 'Sheet1',
            gridProperties: {
              rowCount: 1000,
              columnCount: 10
            }
          }
        }]
      }
    });

    const spreadsheetId = createResponse.data.spreadsheetId!;
    console.log(`✅ Created spreadsheet with ID: ${spreadsheetId}`);

    // Share with service account
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: process.env.GOOGLE_SHEETS_SERVICE_EMAIL!
      }
    });
    console.log(`✅ Shared with service account: ${process.env.GOOGLE_SHEETS_SERVICE_EMAIL}`);

    console.log('\n📝 Next steps:');
    console.log('1. Add this ID to your .env file:');
    console.log(`   GOOGLE_SHEETS_INITIAL_STOCK_ID=${spreadsheetId}`);
    console.log('\n2. Open the sheet to verify access:');
    console.log(`   https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
    console.log('\n3. Restart your backend server to load the new environment variable');
    console.log('\n4. Use the Google Sheets Sync page to set up the template');

  } catch (error: any) {
    console.error('❌ Error creating sheet:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

if (require.main === module) {
  createInitialStockSheet().catch(console.error);
}

export { createInitialStockSheet };