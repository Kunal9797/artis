import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import Distributor from '../models/Distributor';
import sequelize from '../config/sequelize';

dotenv.config();

// The sheet ID provided by the user
const DISTRIBUTOR_SHEET_ID = '1xPAgzNP6xtHdJRd_6We5NxizMI3LQnmG-d80IV5YMyE';
const SHEET_NAME = 'Artis Distributor List';

async function exportDistributorsToSheets() {
  try {
    console.log('🚀 Starting distributor export to Google Sheets...');
    
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
    
    // Fetch all distributors
    const distributors = await Distributor.findAll({
      order: [['state', 'ASC'], ['city', 'ASC'], ['name', 'ASC']]
    });
    
    console.log(`📊 Found ${distributors.length} distributors to export`);
    
    // Prepare data for Google Sheets
    const headers = [
      'ID',
      'Business Name',
      'City',
      'State',
      'Phone Number',
      'Catalogs',
      'Latitude',
      'Longitude',
      'Created Date',
      'Last Updated'
    ];
    
    const rows = distributors.map(distributor => [
      distributor.id,
      distributor.name,
      distributor.city,
      distributor.state,
      distributor.phoneNumber,
      distributor.catalogs.join(', '),
      distributor.latitude || '',
      distributor.longitude || '',
      distributor.get('createdAt') ? new Date(distributor.get('createdAt') as Date).toLocaleDateString() : '',
      distributor.get('updatedAt') ? new Date(distributor.get('updatedAt') as Date).toLocaleDateString() : ''
    ]);
    
    // Check if sheet exists, if not create it
    try {
      const sheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: DISTRIBUTOR_SHEET_ID,
      });
      
      const sheetExists = sheetInfo.data.sheets?.some(
        sheet => sheet.properties?.title === SHEET_NAME
      );
      
      if (!sheetExists) {
        console.log(`📝 Creating sheet "${SHEET_NAME}"...`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: DISTRIBUTOR_SHEET_ID,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: SHEET_NAME,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                }
              }
            }]
          }
        });
      }
    } catch (error) {
      console.log('ℹ️ Sheet might be new, continuing...');
    }
    
    // Clear existing content
    console.log('🧹 Clearing existing sheet content...');
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: DISTRIBUTOR_SHEET_ID,
        range: `'${SHEET_NAME}'!A:Z`,
      });
    } catch (error) {
      console.log('ℹ️ Sheet might be empty, continuing...');
    }
    
    // Write headers and data
    console.log('✍️ Writing data to Google Sheets...');
    const values = [headers, ...rows];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: DISTRIBUTOR_SHEET_ID,
      range: `'${SHEET_NAME}'!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: values
      },
    });
    
    // Get sheet ID for formatting
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: DISTRIBUTOR_SHEET_ID,
    });
    
    const sheet = sheetMetadata.data.sheets?.find(
      s => s.properties?.title === SHEET_NAME
    );
    const sheetId = sheet?.properties?.sheetId || 0;
    
    // Format the sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: DISTRIBUTOR_SHEET_ID,
      requestBody: {
        requests: [
          // Format header row
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.1,
                    green: 0.3,
                    blue: 0.5,
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
          // Auto-resize columns
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: headers.length,
              },
            },
          },
          // Add filter
          {
            setBasicFilter: {
              filter: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: rows.length + 1,
                  startColumnIndex: 0,
                  endColumnIndex: headers.length,
                },
              },
            },
          },
          // Format phone numbers column (column D, index 4)
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 1,
                startColumnIndex: 4,
                endColumnIndex: 5,
              },
              cell: {
                userEnteredFormat: {
                  numberFormat: {
                    type: 'TEXT',
                  },
                },
              },
              fields: 'userEnteredFormat.numberFormat',
            },
          },
        ],
      },
    });
    
    // Add summary statistics
    console.log('\n📊 Export Summary:');
    console.log(`✅ Total distributors exported: ${distributors.length}`);
    
    // Count by state
    const stateCount = distributors.reduce((acc, dist) => {
      acc[dist.state] = (acc[dist.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📍 Distributors by State:');
    Object.entries(stateCount)
      .sort(([, a], [, b]) => b - a)
      .forEach(([state, count]) => {
        console.log(`   ${state}: ${count}`);
      });
    
    // Count by catalog
    const catalogCount = distributors.reduce((acc, dist) => {
      dist.catalogs.forEach(catalog => {
        acc[catalog] = (acc[catalog] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📚 Distributors by Catalog:');
    Object.entries(catalogCount)
      .sort(([, a], [, b]) => b - a)
      .forEach(([catalog, count]) => {
        console.log(`   ${catalog}: ${count}`);
      });
    
    console.log('\n✅ Export completed successfully!');
    console.log(`🔗 Sheet URL: https://docs.google.com/spreadsheets/d/${DISTRIBUTOR_SHEET_ID}/edit#gid=${sheetId}`);
    
    return {
      success: true,
      count: distributors.length,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${DISTRIBUTOR_SHEET_ID}/edit#gid=${sheetId}`,
      stateCount,
      catalogCount
    };
    
  } catch (error) {
    console.error('❌ Error exporting distributors to Google Sheets:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the export
if (require.main === module) {
  exportDistributorsToSheets()
    .then(result => {
      console.log('\n🎉 Export process completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Export process failed:', error);
      process.exit(1);
    });
}

export default exportDistributorsToSheets;