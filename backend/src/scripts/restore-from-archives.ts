import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function restoreFromArchives() {
  console.log('📦 Restoring data from archive tabs...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // 1. Clear Sheet1 first
    console.log('🧹 Clearing Sheet1...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:Z10000',
    });
    
    // 2. Get data from both archive tabs
    console.log('📊 Getting data from archives...');
    const archives = ['Archive_Jul 2025_4_1816', 'Archive_Jul 2025_4_1847'];
    let allData: any[][] = [];
    
    for (const archiveName of archives) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
        range: `${archiveName}!A2:D`,
      });
      
      const rows = response.data.values || [];
      console.log(`${archiveName}: ${rows.length} rows`);
      allData = allData.concat(rows);
    }
    
    console.log(`\nTotal rows from archives: ${allData.length}`);
    
    // 3. Also get the existing 231 rows from Sheet1
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:D232',
    });
    
    const existingRows = existingResponse.data.values || [];
    console.log(`Existing rows in Sheet1: ${existingRows.length}`);
    
    // 4. Combine all data
    const combinedData = [...allData, ...existingRows].filter(row => 
      row && row.length > 0 && row[0] // Filter out empty rows
    );
    
    console.log(`\nTotal combined rows: ${combinedData.length}`);
    
    // 5. Write all data back to Sheet1
    if (combinedData.length > 0) {
      console.log('\n✍️ Writing data back to Sheet1...');
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: combinedData
        }
      });
      
      console.log(`✅ Restored ${combinedData.length} rows to Sheet1`);
    }
    
    // 6. Verify final count
    const finalResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:A',
    });
    
    const finalCount = (finalResponse.data.values || []).length;
    console.log(`\n✅ Final count in Sheet1: ${finalCount} rows`);
    
    console.log('\n🎉 Data restored successfully!');
    console.log('You can now sync the consumption data.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  restoreFromArchives().catch(console.error);
}

export { restoreFromArchives };