"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateToGoogleSheets = migrateToGoogleSheets;
const excel_consolidator_1 = require("../utils/excel-consolidator");
const google_sheets_service_1 = require("../services/google-sheets.service");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
dotenv.config();
/**
 * Main migration script to consolidate Excel files and set up Google Sheets
 */
function migrateToGoogleSheets() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Starting migration to Google Sheets...\n');
        // Step 1: Consolidate all Excel files
        console.log('📊 Step 1: Consolidating Excel files...');
        const consolidator = new excel_consolidator_1.ExcelConsolidator();
        // Create standardized templates
        consolidator.createStandardizedTemplates();
        console.log('✅ Created standardized templates in Templates folder');
        // Generate summary report
        const summaryReport = yield consolidator.generateSummaryReport();
        console.log('📈 Summary Report:');
        console.log(summaryReport);
        // Export consolidated data
        const consolidatedPath = path.join('/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data', `consolidated_inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
        yield consolidator.exportConsolidatedExcel(consolidatedPath);
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
            const sheetsService = new google_sheets_service_1.GoogleSheetsService({
                spreadsheetId: process.env.GOOGLE_SHEETS_ID || '',
                credentials
            });
            // Create new spreadsheet if ID not provided
            if (!process.env.GOOGLE_SHEETS_ID) {
                const newSpreadsheetId = yield sheetsService.createInventorySpreadsheet(`Artis Inventory ${new Date().toISOString().split('T')[0]}`);
                console.log(`✅ Created new Google Sheet: ${newSpreadsheetId}`);
                console.log('📌 Add this to your .env file: GOOGLE_SHEETS_ID=' + newSpreadsheetId);
                // Update service with new ID
                const newService = new google_sheets_service_1.GoogleSheetsService({
                    spreadsheetId: newSpreadsheetId,
                    credentials
                });
                // Set up initial structure
                yield setupInitialSheetStructure(newService);
                console.log('✅ Set up sheet structure and formatting');
                // Import consolidated data
                yield importDataToSheets(newService, consolidator);
                console.log('✅ Imported all data to Google Sheets');
                console.log(`\n🎉 Migration complete! Access your sheet at:`);
                console.log(`https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`);
            }
            else {
                // Update existing sheet
                yield importDataToSheets(sheetsService, consolidator);
                console.log('✅ Updated existing Google Sheet');
            }
        }
        catch (error) {
            console.error('❌ Error with Google Sheets:', error);
        }
    });
}
/**
 * Set up initial sheet structure with headers and formatting
 */
function setupInitialSheetStructure(service) {
    return __awaiter(this, void 0, void 0, function* () {
        // Live Inventory headers
        yield service.updateInventoryData([
            ['Design Code', 'Current Stock (Kgs)', 'Last Updated', 'Avg Monthly Consumption', 'Months Until Stockout']
        ], 'Live Inventory');
        // Consumption headers
        yield service.updateInventoryData([
            ['Design Code', 'Date', 'Quantity (Kgs)', 'Notes']
        ], 'Consumption');
        // Purchases headers
        yield service.updateInventoryData([
            ['Artis Code', 'Date', 'Amount (Kgs)', 'Supplier', 'Notes']
        ], 'Purchases');
        // Apply formatting and validation
        yield service.setupDataValidation();
        yield service.applyConditionalFormatting();
        yield service.createMonthlySummary();
    });
}
/**
 * Import consolidated data to Google Sheets
 */
function importDataToSheets(service, consolidator) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get consolidated data
        const consumption = yield consolidator.consolidateConsumption();
        const purchases = yield consolidator.consolidatePurchases();
        // Import consumption data
        if (consumption.length > 0) {
            yield service.appendConsumption(consumption.map(c => ({
                designCode: c.designCode,
                date: c.date.toISOString().split('T')[0],
                quantity: c.quantity,
                notes: `Imported from: ${c.source}`
            })));
        }
        // Import purchase data
        if (purchases.length > 0) {
            yield service.appendPurchases(purchases.map(p => ({
                artisCode: p.artisCode,
                date: p.date.toISOString().split('T')[0],
                amount: p.amount,
                notes: p.notes || `Imported from: ${p.source}`
            })));
        }
    });
}
// Run the migration
if (require.main === module) {
    migrateToGoogleSheets().catch(console.error);
}
