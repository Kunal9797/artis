import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixPurchaseDates() {
  console.log('🔧 Fixing invalid dates in Purchases sheet...\n');
  
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
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:E',
    });
    
    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows to process`);
    
    // Base date: January 1, 2024
    const baseDate = new Date('2024-01-01');
    
    // Fix dates
    const fixedRows = rows.map((row, index) => {
      const [artisCode, quantity, dateValue, supplier, notes] = row;
      
      if (!dateValue || dateValue.includes('Example:') || dateValue.includes('Instructions:')) {
        return row;
      }
      
      // Convert day number to proper date
      const dayNumber = parseInt(dateValue);
      if (!isNaN(dayNumber)) {
        const actualDate = new Date(baseDate);
        actualDate.setDate(actualDate.getDate() + dayNumber - 1);
        
        // Format as YYYY-MM-DD
        const formattedDate = actualDate.toISOString().split('T')[0];
        
        console.log(`Row ${index + 2}: Converting "${dateValue}" → "${formattedDate}"`);
        
        return [artisCode, quantity, formattedDate, supplier || '', notes || ''];
      }
      
      return row;
    });
    
    // Clear existing data
    console.log('\n📝 Updating sheet with fixed dates...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:E1000',
    });
    
    // Write fixed data
    if (fixedRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: fixedRows
        }
      });
    }
    
    console.log('\n✅ All dates fixed successfully!');
    console.log('You can now run the sync.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  fixPurchaseDates().catch(console.error);
}

export { fixPurchaseDates };