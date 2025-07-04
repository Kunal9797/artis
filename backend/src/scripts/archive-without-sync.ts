import { SheetsManagerService } from '../services/sheets-manager.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function archiveWithoutSync() {
  console.log('📦 Archiving all sheet data WITHOUT syncing to database...\n');
  
  const sheetsManager = new SheetsManagerService();
  
  try {
    // Archive each sheet type
    const sheetTypes = ['consumption', 'purchases', 'corrections', 'initialStock'] as const;
    
    for (const sheetType of sheetTypes) {
      console.log(`📊 Archiving ${sheetType} sheet...`);
      try {
        await sheetsManager.archiveSheet(sheetType);
        console.log(`✅ ${sheetType} archived successfully\n`);
      } catch (error: any) {
        if (error.message?.includes('No data to archive')) {
          console.log(`⚠️  ${sheetType} sheet is empty, skipping\n`);
        } else {
          console.error(`❌ Error archiving ${sheetType}:`, error.message);
        }
      }
    }
    
    console.log('✅ All sheets archived!');
    console.log('\nNext steps:');
    console.log('1. Verify archive tabs in each Google Sheet');
    console.log('2. Main sheets are now empty and ready for June 2025 data');
    console.log('3. Add June data and sync normally');
    
  } catch (error) {
    console.error('❌ Error during archiving:', error);
  }
}

if (require.main === module) {
  archiveWithoutSync().catch(console.error);
}

export { archiveWithoutSync };