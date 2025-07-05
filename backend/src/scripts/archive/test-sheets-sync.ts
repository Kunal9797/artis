import { SheetsManagerService } from '../services/sheets-manager.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSheetsSync() {
  console.log('🧪 Testing Google Sheets Sync...\n');

  const sheetsManager = new SheetsManagerService();

  try {
    // 1. Get pending counts
    console.log('📊 Checking pending data counts...');
    const pending = await sheetsManager.getPendingSummary();
    console.log('Pending counts:', pending);
    console.log();

    // 2. Setup templates if needed
    if (pending.consumption === 0) {
      console.log('Setting up consumption template...');
      await sheetsManager.setupConsumptionSheet();
    }

    if (pending.purchases === 0) {
      console.log('Setting up purchases template...');
      await sheetsManager.setupPurchasesSheet();
    }

    if (pending.corrections === 0) {
      console.log('Setting up corrections template...');
      await sheetsManager.setupCorrectionsSheet();
    }

    console.log('\n✅ All tests passed!');
    console.log('\n📌 Next steps:');
    console.log('1. Open the Google Sheets and add some test data');
    console.log('2. Run this script again to see pending counts');
    console.log('3. Use the sync API endpoints to import data');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

if (require.main === module) {
  testSheetsSync().catch(console.error);
}

export { testSheetsSync };