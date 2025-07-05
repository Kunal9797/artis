import { google } from 'googleapis';
import sequelize from '../config/sequelize';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { QueryTypes } from 'sequelize';

dotenv.config();

async function checkAndFixSheets() {
  console.log('🔍 Checking sheet issues...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    await sequelize.authenticate();
    
    // 1. Check for duplicate consumption entries
    console.log('📊 Checking consumption sheet for duplicates...');
    
    const consumptionResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:C',
    });
    
    const rows = consumptionResponse.data.values || [];
    const seen = new Map<string, number>();
    let duplicates = 0;
    
    rows.forEach((row, index) => {
      if (row[0] && row[2]) {
        const key = `${row[0]}-${row[2]}`; // artisCode-month
        if (seen.has(key)) {
          duplicates++;
          console.log(`Duplicate found: ${key} at rows ${seen.get(key)! + 2} and ${index + 2}`);
        } else {
          seen.set(key, index);
        }
      }
    });
    
    console.log(`Found ${duplicates} duplicate entries\n`);
    
    // 2. Check for missing corrections
    console.log('📊 Checking for CORRECTION transactions...');
    
    const corrections = await sequelize.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        t.date,
        t.type,
        t.quantity,
        t.notes
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p.id
      WHERE t.type = 'CORRECTION'
      ORDER BY t.date ASC
    `, { type: QueryTypes.SELECT });
    
    console.log(`Found ${(corrections as any[]).length} correction transactions in database\n`);
    
    // 3. Get correction sheet status
    const correctionResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
      range: 'Sheet1!A2:E',
    });
    
    const correctionRows = (correctionResponse.data.values || [])
      .filter(row => row[0] && !row[0].includes('Example:') && !row[0].includes('Instructions:'));
    
    console.log(`Corrections sheet has ${correctionRows.length} entries\n`);
    
    // Show corrections that need to be added
    if ((corrections as any[]).length > 0) {
      console.log('📋 Corrections to add:');
      (corrections as any[]).slice(0, 5).forEach(c => {
        console.log(`- ${c.artis_code}: ${c.quantity > 0 ? '+' : ''}${c.quantity} kg on ${new Date(c.date).toLocaleDateString()}`);
      });
      if ((corrections as any[]).length > 5) {
        console.log(`... and ${(corrections as any[]).length - 5} more`);
      }
    }
    
    console.log('\n🔧 Fix Options:');
    console.log('1. Clear consumption sheet and re-migrate (removes duplicates)');
    console.log('2. Add missing corrections to corrections sheet');
    console.log('3. Both of the above');
    console.log('\nRun: npm run fix-sheets');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  checkAndFixSheets().catch(console.error);
}

export { checkAndFixSheets };