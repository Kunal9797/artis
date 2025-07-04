import { ExcelConsolidator } from '../utils/excel-consolidator';
import { GoogleSheetsService } from '../services/google-sheets.service';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';

dotenv.config();

/**
 * Main migration script to consolidate Excel files and set up Google Sheets
 */
async function migrateToGoogleSheets() {
  console.log('🚀 Starting migration to Google Sheets...\n');

  // Step 1: Consolidate all Excel files
  console.log('📊 Step 1: Consolidating Excel files...');
  const consolidator = new ExcelConsolidator();
  
  // Create standardized templates
  consolidator.createStandardizedTemplates();
  console.log('✅ Created standardized templates in Templates folder');

  // Generate summary report
  const summaryReport = await consolidator.generateSummaryReport();
  console.log('📈 Summary Report:');
  console.log(summaryReport);

  // Export consolidated data
  const consolidatedPath = path.join(
    '/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data',
    `consolidated_inventory_${new Date().toISOString().split('T')[0]}.xlsx`
  );
  await consolidator.exportConsolidatedExcel(consolidatedPath);
  console.log(`✅ Exported consolidated data to: ${consolidatedPath}\n`);

  // Step 2: Set up Google Sheets (if credentials are available)
  const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
  
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    console.log('⚠️  Google Sheets credentials not found.');
    console.log('\nTo set up Google Sheets integration:');
    console.log('1. Go to Google Cloud Console (https://console.cloud.google.com)');
    console.log('2. Create a new project or select existing');
    console.log('3. Enable Google Sheets API');
    console.log('4. Create a service account and download credentials JSON');
    console.log('5. Set GOOGLE_SHEETS_CREDENTIALS_PATH in .env file');
    console.log('\nFor now, you can use the consolidated Excel file created above.');
    return;
  }

  console.log('📋 Step 2: Setting up Google Sheets...');
  
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const sheetsService = new GoogleSheetsService({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID || '',
      credentials
    });

    // Create new spreadsheet if ID not provided
    if (!process.env.GOOGLE_SHEETS_ID) {
      const newSpreadsheetId = await sheetsService.createInventorySpreadsheet(
        `Artis Inventory ${new Date().toISOString().split('T')[0]}`
      );
      console.log(`✅ Created new Google Sheet: ${newSpreadsheetId}`);
      console.log('📌 Add this to your .env file: GOOGLE_SHEETS_ID=' + newSpreadsheetId);
      
      // Update service with new ID
      const newService = new GoogleSheetsService({
        spreadsheetId: newSpreadsheetId,
        credentials
      });

      // Set up initial structure
      await setupInitialSheetStructure(newService);
      console.log('✅ Set up sheet structure and formatting');

      // Import consolidated data
      await importDataToSheets(newService, consolidator);
      console.log('✅ Imported all data to Google Sheets');

      console.log(`\n🎉 Migration complete! Access your sheet at:`);
      console.log(`https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`);
    } else {
      // Update existing sheet
      await importDataToSheets(sheetsService, consolidator);
      console.log('✅ Updated existing Google Sheet');
    }

  } catch (error) {
    console.error('❌ Error with Google Sheets:', error);
  }
}

/**
 * Set up initial sheet structure with headers and formatting
 */
async function setupInitialSheetStructure(service: GoogleSheetsService) {
  // Live Inventory headers
  await service.updateInventoryData([
    ['Design Code', 'Current Stock (Kgs)', 'Last Updated', 'Avg Monthly Consumption', 'Months Until Stockout']
  ], 'Live Inventory');

  // Consumption headers
  await service.updateInventoryData([
    ['Design Code', 'Date', 'Quantity (Kgs)', 'Notes']
  ], 'Consumption');

  // Purchases headers
  await service.updateInventoryData([
    ['Artis Code', 'Date', 'Amount (Kgs)', 'Supplier', 'Notes']
  ], 'Purchases');

  // Apply formatting and validation
  await service.setupDataValidation();
  await service.applyConditionalFormatting();
  await service.createMonthlySummary();
}

/**
 * Import consolidated data to Google Sheets
 */
async function importDataToSheets(service: GoogleSheetsService, consolidator: ExcelConsolidator) {
  // Get consolidated data
  const consumption = await consolidator.consolidateConsumption();
  const purchases = await consolidator.consolidatePurchases();

  // Import consumption data
  if (consumption.length > 0) {
    await service.appendConsumption(
      consumption.map(c => ({
        designCode: c.designCode,
        date: c.date.toISOString().split('T')[0],
        quantity: c.quantity,
        notes: `Imported from: ${c.source}`
      }))
    );
  }

  // Import purchase data
  if (purchases.length > 0) {
    await service.appendPurchases(
      purchases.map(p => ({
        artisCode: p.artisCode,
        date: p.date.toISOString().split('T')[0],
        amount: p.amount,
        notes: p.notes || `Imported from: ${p.source}`
      }))
    );
  }
}

// Run the migration
if (require.main === module) {
  migrateToGoogleSheets().catch(console.error);
}

export { migrateToGoogleSheets };