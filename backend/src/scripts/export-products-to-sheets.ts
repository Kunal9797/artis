import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Product } from '../models';
import sequelize from '../config/sequelize';

dotenv.config();

// Using the new sheet ID from the URL you provided
const MASTER_SHEET_ID = '1MMr_2x0V6XF244yc2vvbPp8y_wrLedLUOLSzq6WnHLo';

async function exportProductsToSheets() {
  try {
    console.log('🚀 Starting product export to Google Sheets...');
    
    // Initialize Google Sheets API
    const credentials = JSON.parse(
      fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
    );
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Fetch all products
    const products = await Product.findAll({
      order: [['category', 'ASC'], ['name', 'ASC']]
    });
    
    console.log(`📊 Found ${products.length} products to export`);
    
    // Prepare data for Google Sheets
    const headers = [
      'Artis Codes',
      'Supplier Code',
      'Product Name',
      'Category',
      'Supplier',
      'Catalogs',
      'Last Updated'
    ];
    
    const rows = products.map(product => [
      product.artisCodes.join(', '),
      product.supplierCode,
      product.name || '',
      product.category || '',
      product.supplier || '',
      product.catalogs ? product.catalogs.join(', ') : '',
      product.lastUpdated ? new Date(product.lastUpdated).toLocaleDateString() : ''
    ]);
    
    // Clear existing content
    console.log('🧹 Clearing existing sheet content...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: MASTER_SHEET_ID,
      range: 'Sheet1!A:Z',
    });
    
    // Write headers and data
    console.log('✍️ Writing data to Google Sheets...');
    const values = [headers, ...rows];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: MASTER_SHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      },
    });
    
    // Format the header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MASTER_SHEET_ID,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.2,
                    blue: 0.2,
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1,
                    },
                    fontSize: 11,
                    bold: true,
                  },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: headers.length,
              },
            },
          },
          {
            setBasicFilter: {
              filter: {
                range: {
                  sheetId: 0,
                  startRowIndex: 0,
                  endRowIndex: rows.length + 1,
                  startColumnIndex: 0,
                  endColumnIndex: headers.length,
                },
              },
            },
          },
        ],
      },
    });
    
    console.log('✅ Export completed successfully!');
    console.log(`📋 Exported ${products.length} products to Google Sheets`);
    console.log(`🔗 Sheet URL: https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/edit`);
    
    // Get sheet metadata to display the actual name
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: MASTER_SHEET_ID,
    });
    
    console.log(`📝 Sheet Name: ${sheetMetadata.data.properties?.title}`);
    
    return {
      success: true,
      count: products.length,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/edit`
    };
    
  } catch (error) {
    console.error('❌ Error exporting products to Google Sheets:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the export
if (require.main === module) {
  exportProductsToSheets()
    .then(result => {
      console.log('\n🎉 Export process completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Export process failed:', error);
      process.exit(1);
    });
}

export default exportProductsToSheets;