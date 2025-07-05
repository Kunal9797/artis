import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSheetsDuplicates() {
  console.log('🔍 Checking for duplicates in Google Sheets...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // Check Consumption Sheet
    console.log('📊 Checking Consumption sheet...');
    const consResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:D',
    });
    
    const consRows = consResponse.data.values || [];
    const consKeys = new Set<string>();
    let consDuplicates = 0;
    
    consRows.forEach((row) => {
      const [artisCode, consumption, month] = row;
      if (artisCode && consumption && month) {
        const key = `${artisCode}-${month}`;
        if (consKeys.has(key)) {
          consDuplicates++;
          console.log(`  Duplicate: ${key}`);
        }
        consKeys.add(key);
      }
    });
    
    console.log(`  Total rows: ${consRows.length}`);
    console.log(`  Unique entries: ${consKeys.size}`);
    console.log(`  Duplicates: ${consDuplicates}\n`);
    
    // Check Purchases Sheet
    console.log('📊 Checking Purchases sheet...');
    const purchResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:D',
    });
    
    const purchRows = purchResponse.data.values || [];
    const purchKeys = new Set<string>();
    let purchDuplicates = 0;
    
    purchRows.forEach((row) => {
      const [artisCode, date, amount] = row;
      if (artisCode && date && amount) {
        const key = `${artisCode}-${date}-${amount}`;
        if (purchKeys.has(key)) {
          purchDuplicates++;
          console.log(`  Duplicate: ${key}`);
        }
        purchKeys.add(key);
      }
    });
    
    console.log(`  Total rows: ${purchRows.length}`);
    console.log(`  Unique entries: ${purchKeys.size}`);
    console.log(`  Duplicates: ${purchDuplicates}\n`);
    
    // Check Corrections Sheet
    console.log('📊 Checking Corrections sheet...');
    const corrResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
      range: 'Sheet1!A2:E',
    });
    
    const corrRows = corrResponse.data.values || [];
    const corrKeys = new Set<string>();
    let corrDuplicates = 0;
    
    corrRows.forEach((row) => {
      const [artisCode, amount, type, date] = row;
      if (artisCode && amount) {
        const key = `${artisCode}-${amount}-${date || 'nodate'}`;
        if (corrKeys.has(key)) {
          corrDuplicates++;
          console.log(`  Duplicate: ${key}`);
        }
        corrKeys.add(key);
      }
    });
    
    console.log(`  Total rows: ${corrRows.length}`);
    console.log(`  Unique entries: ${corrKeys.size}`);
    console.log(`  Duplicates: ${corrDuplicates}\n`);
    
    if (consDuplicates > 0 || purchDuplicates > 0 || corrDuplicates > 0) {
      console.log('⚠️  WARNING: Found duplicates in Google Sheets!');
      console.log('These should be cleaned up before syncing.');
    } else {
      console.log('✅ No duplicates found in Google Sheets');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  checkSheetsDuplicates().catch(console.error);
}

export { checkSheetsDuplicates };