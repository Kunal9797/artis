import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkInvalidDates() {
  console.log('🔍 Checking for invalid dates in Google Sheets...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Check Purchases sheet
    console.log('📊 Checking Purchases sheet...');
    const purchResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:D',
    });
    
    const purchRows = purchResponse.data.values || [];
    const invalidDates: number[] = [];
    
    purchRows.forEach((row, index) => {
      const [artisCode, quantity, purchaseDate] = row;
      if (purchaseDate) {
        // Check for obviously invalid dates (like year 0234 or 2748)
        const year = parseInt(purchaseDate.substring(0, 4));
        if (year < 1900 || year > 2030 || isNaN(year)) {
          invalidDates.push(index + 2); // +2 for header and 0-based index
          console.log(`Row ${index + 2}: Invalid date "${purchaseDate}" for product ${artisCode}`);
        }
      }
    });
    
    console.log(`\nFound ${invalidDates.length} rows with invalid dates`);
    
    if (invalidDates.length > 0) {
      console.log('\nTo fix these dates:');
      console.log('1. Open the Purchases Google Sheet');
      console.log('2. Check these rows:', invalidDates.slice(0, 10).join(', '), invalidDates.length > 10 ? `... and ${invalidDates.length - 10} more` : '');
      console.log('3. Fix the date format (should be YYYY-MM-DD)');
      console.log('4. Common issue: Dates like "0234" should be "2024"');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  checkInvalidDates().catch(console.error);
}

export { checkInvalidDates };