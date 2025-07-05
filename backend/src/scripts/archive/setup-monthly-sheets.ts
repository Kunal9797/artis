import { GoogleSheetsService } from '../services/google-sheets.service';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Product } from '../models';
import sequelize from '../config/sequelize';

dotenv.config();

async function setupMonthlySheets() {
  console.log('📊 Setting up monthly upload sheets...\n');

  // Initialize Google Sheets
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const sheetsService = new GoogleSheetsService({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
    credentials
  });

  try {
    // Connect to database to get product list
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Get current month
    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // 1. Create Monthly Upload Template
    console.log(`📝 Creating template for ${monthName}...`);
    
    // Get all products
    const products = await Product.findAll({
      order: [['artisCodes', 'ASC']],
      attributes: ['artisCodes']
    });

    // Create template data
    const templateData = [
      ['Artis Code', 'Consumption (kg)', 'Purchases (kg)', 'Notes'],
      ...products.map(p => [
        p.artisCodes[0] || '',
        '', // Empty for user to fill
        '', // Empty for user to fill
        monthName
      ])
    ];

    await sheetsService.updateInventoryData(templateData, `Upload - ${monthName}`);
    console.log(`✅ Created monthly upload template`);

    // 2. Create Corrections Template
    console.log('\n📝 Creating corrections template...');
    
    const correctionsData = [
      ['Artis Code', 'Month (YYYY-MM)', 'Type', 'Old Value', 'New Value', 'Reason'],
      // Example rows
      ['Example: 101', '2024-12', 'Consumption', '100', '120', 'Data entry error'],
      ['Example: 102', '2024-11', 'Purchase', '500', '450', 'Wrong quantity'],
    ];

    await sheetsService.updateInventoryData(correctionsData, 'Corrections');
    console.log('✅ Created corrections template');

    // 3. Create Quick Entry sheet for daily updates
    console.log('\n📝 Creating quick entry sheet...');
    
    const quickEntryData = [
      ['Date', 'Artis Code', 'Type', 'Quantity (kg)', 'Notes'],
      [currentDate.toISOString().split('T')[0], '', 'Consumption', '', ''],
      ['', '', 'Purchase', '', ''],
    ];

    await sheetsService.updateInventoryData(quickEntryData, 'Quick Entry');
    console.log('✅ Created quick entry sheet');

    // 4. Create Instructions sheet
    console.log('\n📝 Adding instructions...');
    
    const instructionsData = [
      ['How to Use This Sheet'],
      [''],
      ['1. MONTHLY UPLOAD:'],
      ['   - Go to "Upload - [Month]" tab'],
      ['   - Fill in Consumption and/or Purchases columns'],
      ['   - Click "Sync to Database" in your app'],
      [''],
      ['2. CORRECTIONS:'],
      ['   - Go to "Corrections" tab'],
      ['   - Enter the Artis Code, Month, and correction details'],
      ['   - Old Value = what\'s currently in the system'],
      ['   - New Value = what it should be'],
      [''],
      ['3. QUICK ENTRY:'],
      ['   - For daily entries during the month'],
      ['   - Gets consolidated at month end'],
      [''],
      ['TIPS:'],
      ['- Leave cells empty if no data (don\'t put 0)'],
      ['- Dates should be in YYYY-MM-DD format'],
      ['- All quantities in kilograms'],
    ];

    await sheetsService.updateInventoryData(instructionsData, 'Instructions');
    console.log('✅ Added instructions');

    console.log('\n🎉 Setup complete!');
    console.log(`📊 Open your sheet: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}/edit`);
    console.log('\n📌 Next steps:');
    console.log('1. Fill in the monthly data');
    console.log('2. Run sync from your app to import to Supabase');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Add sync function to pull data from sheets
export async function syncFromGoogleSheets() {
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const sheetsService = new GoogleSheetsService({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
    credentials
  });

  // Get current month sheet
  const currentDate = new Date();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const data = await sheetsService.getInventorySnapshot();
  
  // Process and import to Supabase
  console.log(`Found ${data.length} rows to process`);
  
  // Implementation depends on your specific needs
  return data;
}

if (require.main === module) {
  setupMonthlySheets().catch(console.error);
}