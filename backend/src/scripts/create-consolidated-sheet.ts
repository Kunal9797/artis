import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ExcelConsolidator } from '../utils/excel-consolidator';
import * as path from 'path';

dotenv.config();

interface ConsolidatedRow {
  artisCode: string;
  [month: string]: number | string; // Dynamic columns for each month
}

async function createConsolidatedSheet() {
  console.log('🚀 Creating Consolidated Google Sheet...\n');

  // Load credentials
  const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    console.error('❌ Credentials file not found');
    return;
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  // Initialize Google Sheets API
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Step 1: Create new spreadsheet
  console.log('📊 Creating new spreadsheet...');
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `Artis Inventory Consolidated - ${new Date().toISOString().split('T')[0]}`,
      },
      sheets: [
        {
          properties: {
            title: 'Consumption',
            gridProperties: { 
              frozenRowCount: 1,
              frozenColumnCount: 1 
            },
          },
        },
        {
          properties: {
            title: 'Purchases',
            gridProperties: { 
              frozenRowCount: 1,
              frozenColumnCount: 1 
            },
          },
        },
        {
          properties: {
            title: 'Combined View',
            gridProperties: { 
              frozenRowCount: 1,
              frozenColumnCount: 1 
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId!;
  console.log(`✅ Created spreadsheet: ${spreadsheetId}`);
  console.log(`📌 Add to .env: GOOGLE_SHEETS_ID=${spreadsheetId}`);

  // Step 2: Get data from Excel files
  console.log('\n📁 Reading Excel files...');
  const consolidator = new ExcelConsolidator();
  const consumptionData = await consolidator.consolidateConsumption();
  const purchaseData = await consolidator.consolidatePurchases();

  // Step 3: Transform data to wide format (one row per product)
  const consumptionByProduct = transformToWideFormat(
    consumptionData
      .filter(c => c.date && !isNaN(c.date.getTime()))
      .map(c => ({
        artisCode: c.designCode,
        month: c.date.toISOString().slice(0, 7),
        value: c.quantity
      }))
  );

  const purchasesByProduct = transformToWideFormat(
    purchaseData
      .filter(p => p.date && !isNaN(p.date.getTime()))
      .map(p => ({
        artisCode: p.artisCode,
        month: p.date.toISOString().slice(0, 7),
        value: p.amount
      }))
  );

  // Get all unique months
  const allMonths = getUniqueMonths([...consumptionData.map(c => c.date), ...purchaseData.map(p => p.date)]);

  // Step 4: Create consumption sheet data
  const consumptionSheetData = createSheetData(consumptionByProduct, allMonths, 'Consumption');
  await updateSheet(sheets, spreadsheetId, 'Consumption', consumptionSheetData);
  console.log('✅ Updated Consumption sheet');

  // Step 5: Create purchases sheet data
  const purchasesSheetData = createSheetData(purchasesByProduct, allMonths, 'Purchases');
  await updateSheet(sheets, spreadsheetId, 'Purchases', purchasesSheetData);
  console.log('✅ Updated Purchases sheet');

  // Step 6: Create combined view
  const combinedData = createCombinedView(consumptionByProduct, purchasesByProduct, allMonths);
  await updateSheet(sheets, spreadsheetId, 'Combined View', combinedData);
  console.log('✅ Updated Combined View');

  // Step 7: Apply formatting
  await applyFormatting(sheets, spreadsheetId);
  console.log('✅ Applied formatting');

  // Step 8: Share with service account
  console.log(`\n📤 Share this sheet with: ${process.env.GOOGLE_SHEETS_SERVICE_EMAIL}`);
  console.log(`🔗 Open sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  
  // Save the spreadsheet ID
  fs.appendFileSync('.env', `\nGOOGLE_SHEETS_ID=${spreadsheetId}\n`);
  console.log('\n✅ Added GOOGLE_SHEETS_ID to .env file');
}

function transformToWideFormat(data: Array<{artisCode: string, month: string, value: number}>): Map<string, ConsolidatedRow> {
  const result = new Map<string, ConsolidatedRow>();
  
  data.forEach(item => {
    if (!result.has(item.artisCode)) {
      result.set(item.artisCode, { artisCode: item.artisCode });
    }
    
    const row = result.get(item.artisCode)!;
    // Sum if multiple entries for same month
    row[item.month] = (row[item.month] as number || 0) + item.value;
  });
  
  return result;
}

function getUniqueMonths(dates: Date[]): string[] {
  const months = new Set<string>();
  dates.forEach(date => {
    if (date && !isNaN(date.getTime())) {
      months.add(date.toISOString().slice(0, 7));
    }
  });
  return Array.from(months).sort();
}

function createSheetData(
  productData: Map<string, ConsolidatedRow>, 
  allMonths: string[], 
  type: string
): any[][] {
  // Header row
  const headers = ['Artis Code', ...allMonths.map(month => {
    const [year, monthNum] = month.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return monthName;
  })];
  
  // Data rows
  const rows: any[][] = [headers];
  
  // Sort products by artis code
  const sortedProducts = Array.from(productData.values()).sort((a, b) => 
    a.artisCode.localeCompare(b.artisCode)
  );
  
  sortedProducts.forEach(product => {
    const row: any[] = [product.artisCode];
    allMonths.forEach(month => {
      row.push(product[month] || 0);
    });
    rows.push(row);
  });
  
  // Add totals row
  const totalsRow = ['TOTAL'];
  allMonths.forEach((month, index) => {
    const colLetter = String.fromCharCode(66 + index); // B, C, D, etc.
    totalsRow.push(`=SUM(${colLetter}2:${colLetter}${rows.length})`);
  });
  rows.push(totalsRow);
  
  return rows;
}

function createCombinedView(
  consumption: Map<string, ConsolidatedRow>,
  purchases: Map<string, ConsolidatedRow>,
  allMonths: string[]
): any[][] {
  const headers: string[] = ['Artis Code'];
  
  // Create headers with C- for consumption and P- for purchases
  allMonths.forEach(month => {
    const [year, monthNum] = month.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    headers.push(`C-${monthName}`, `P-${monthName}`);
  });
  
  const rows: any[][] = [headers];
  
  // Get all unique artis codes
  const allCodes = new Set([...consumption.keys(), ...purchases.keys()]);
  const sortedCodes = Array.from(allCodes).sort();
  
  sortedCodes.forEach(code => {
    const row: any[] = [code];
    const consData = consumption.get(code);
    const purchData = purchases.get(code);
    
    allMonths.forEach(month => {
      row.push(consData?.[month] || 0, purchData?.[month] || 0);
    });
    
    rows.push(row);
  });
  
  return rows;
}

async function updateSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  data: any[][]
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: data },
  });
}

async function applyFormatting(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<void> {
  const sheetIds = await getSheetIds(sheets, spreadsheetId);
  
  const requests = [
    // Bold header row for all sheets
    ...Object.values(sheetIds).map(sheetId => ({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    })),
    
    // Number format for data cells
    ...Object.values(sheetIds).map(sheetId => ({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          startColumnIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'NUMBER',
              pattern: '#,##0',
            },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    })),
  ];
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });
}

async function getSheetIds(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<Record<string, number>> {
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const result: Record<string, number> = {};
  
  response.data.sheets?.forEach(sheet => {
    if (sheet.properties?.title && sheet.properties.sheetId != null) {
      result[sheet.properties.title] = sheet.properties.sheetId;
    }
  });
  
  return result;
}

// Run the script
if (require.main === module) {
  createConsolidatedSheet().catch(console.error);
}

export { createConsolidatedSheet };