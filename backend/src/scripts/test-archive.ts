import { SheetsManagerService } from '../services/sheets-manager.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function testArchive() {
  console.log('🧪 Testing archive functionality...\n');
  
  const sheetsManager = new SheetsManagerService();
  
  try {
    // Test archiving consumption sheet
    console.log('📊 Testing consumption sheet archive...');
    await sheetsManager.archiveSheet('consumption');
    
    // Get list of archives
    console.log('\n📋 Getting archive tabs...');
    const archives = await sheetsManager.getArchiveTabs('consumption');
    console.log('Archive tabs found:', archives);
    
    console.log('\n✅ Archive test completed!');
    
  } catch (error) {
    console.error('❌ Error during archive test:', error);
  }
}

if (require.main === module) {
  testArchive().catch(console.error);
}

export { testArchive };