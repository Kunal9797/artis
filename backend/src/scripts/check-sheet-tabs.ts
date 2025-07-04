import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const SHEET_IDS = {
  consumption: process.env.GOOGLE_SHEETS_CONSUMPTION_ID || '1hwS0u_Mcf7795WeMlX3Eez7j0J4ikR8JCz19nJvisJU',
  purchases: process.env.GOOGLE_SHEETS_PURCHASES_ID || '1gPOqkdU6NpOC0yx6Q-tx2PZs54VDyrbip5kTUJQ13Tw',
  corrections: process.env.GOOGLE_SHEETS_CORRECTIONS_ID || '1WxtUXZC4XT7K5TX--rUivk7g0tT4WCBwc7tbyksKT3w',
  initialStock: process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID || '1jS87QQ0eoVNQF9ymrRhiROU_oEyW-1zhnN382EX1Abs'
};

async function checkSheetTabs() {
  try {
    const credentials = JSON.parse(
      fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
    );
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('📊 Checking sheet tabs...\n');

    for (const [sheetName, sheetId] of Object.entries(SHEET_IDS)) {
      try {
        const response = await sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        });

        const sheetTabs = response.data.sheets?.map(sheet => sheet.properties?.title) || [];
        
        console.log(`📋 ${sheetName.charAt(0).toUpperCase() + sheetName.slice(1)} Sheet:`);
        console.log(`   Tabs: ${sheetTabs.join(', ')}`);
        
        if (sheetName === 'consumption' && sheetTabs.includes('Archive')) {
          console.log('   ⚠️  WARNING: Archive tab still exists in consumption sheet!');
        }
        
        console.log('');
      } catch (error: any) {
        console.error(`Error checking ${sheetName} sheet:`, error.message);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSheetTabs();