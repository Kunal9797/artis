import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function deduplicateConsumption() {
  console.log('🧹 Deduplicating consumption data...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Get current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:D',
    });
    
    const rows = response.data.values || [];
    console.log('Current rows:', rows.length);
    
    // Deduplicate by artis code + month
    const unique = new Map<string, any[]>();
    let duplicates = 0;
    
    rows.forEach((row: any[]) => {
      if (row && row[0] && row[2]) {
        const key = `${row[0]}-${row[2]}`;
        if (!unique.has(key)) {
          unique.set(key, row);
        } else {
          duplicates++;
        }
      }
    });
    
    console.log('Unique rows:', unique.size);
    console.log('Duplicates found:', duplicates);
    
    // Clear and write unique data
    console.log('\nCleaning up...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:Z10000',
    });
    
    const uniqueRows = Array.from(unique.values());
    
    if (uniqueRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: uniqueRows
        }
      });
    }
    
    console.log('✅ Cleaned! Final count:', uniqueRows.length);
    
    // The expected count should be 1,230
    if (uniqueRows.length === 1230) {
      console.log('✨ Perfect! All consumption data restored without duplicates.');
    } else {
      console.log(`⚠️  Expected 1,230 rows but got ${uniqueRows.length}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  deduplicateConsumption().catch(console.error);
}

export { deduplicateConsumption };