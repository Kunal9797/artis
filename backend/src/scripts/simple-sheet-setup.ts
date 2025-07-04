import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupSimpleSheets() {
  console.log('📊 Setting up your Google Sheet...\n');

  // Initialize Google Sheets API
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID!;

  try {
    // Simple monthly upload template
    const uploadTemplate = [
      ['Artis Code', 'Consumption (kg)', 'Purchases (kg)', 'Month'],
      ['101', '', '', 'July 2025'],
      ['102', '', '', 'July 2025'],
      ['103', '', '', 'July 2025'],
      ['', '', '', ''],
      ['Instructions:', '', '', ''],
      ['1. Fill in consumption/purchases for each product', '', '', ''],
      ['2. Leave blank if no data', '', '', ''],
      ['3. Save and sync from app', '', '', ''],
    ];

    // Update Sheet1 (default sheet)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: uploadTemplate },
    });
    
    console.log('✅ Created upload template in Sheet1');

    // Add corrections template in A15
    const correctionsTemplate = [
      ['', '', '', ''],
      ['CORRECTIONS TEMPLATE', '', '', ''],
      ['Artis Code', 'Month (YYYY-MM)', 'Type', 'Old Value', 'New Value', 'Reason'],
      ['Example: 101', '2024-12', 'Consumption', '100', '120', 'Data error'],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A15',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: correctionsTemplate },
    });

    console.log('✅ Added corrections template');

    // Apply some basic formatting
    const requests = [
      {
        repeatCell: {
          range: {
            sheetId: 0, // Sheet1
            startRowIndex: 0,
            endRowIndex: 1,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
            },
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        },
      },
    ];

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    console.log('✅ Applied formatting');
    console.log(`\n📊 Your sheet is ready: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  setupSimpleSheets().catch(console.error);
}

export { setupSimpleSheets };