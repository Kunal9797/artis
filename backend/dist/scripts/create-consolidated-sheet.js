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
exports.createConsolidatedSheet = createConsolidatedSheet;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const excel_consolidator_1 = require("../utils/excel-consolidator");
dotenv.config();
function createConsolidatedSheet() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Creating Consolidated Google Sheet...\n');
        // Load credentials
        const credentialsPath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
        if (!credentialsPath || !fs.existsSync(credentialsPath)) {
            console.error('❌ Credentials file not found');
            return;
        }
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        // Initialize Google Sheets API
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
        // Step 1: Create new spreadsheet
        console.log('📊 Creating new spreadsheet...');
        const response = yield sheets.spreadsheets.create({
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
        const spreadsheetId = response.data.spreadsheetId;
        console.log(`✅ Created spreadsheet: ${spreadsheetId}`);
        console.log(`📌 Add to .env: GOOGLE_SHEETS_ID=${spreadsheetId}`);
        // Step 2: Get data from Excel files
        console.log('\n📁 Reading Excel files...');
        const consolidator = new excel_consolidator_1.ExcelConsolidator();
        const consumptionData = yield consolidator.consolidateConsumption();
        const purchaseData = yield consolidator.consolidatePurchases();
        // Step 3: Transform data to wide format (one row per product)
        const consumptionByProduct = transformToWideFormat(consumptionData
            .filter(c => c.date && !isNaN(c.date.getTime()))
            .map(c => ({
            artisCode: c.designCode,
            month: c.date.toISOString().slice(0, 7),
            value: c.quantity
        })));
        const purchasesByProduct = transformToWideFormat(purchaseData
            .filter(p => p.date && !isNaN(p.date.getTime()))
            .map(p => ({
            artisCode: p.artisCode,
            month: p.date.toISOString().slice(0, 7),
            value: p.amount
        })));
        // Get all unique months
        const allMonths = getUniqueMonths([...consumptionData.map(c => c.date), ...purchaseData.map(p => p.date)]);
        // Step 4: Create consumption sheet data
        const consumptionSheetData = createSheetData(consumptionByProduct, allMonths, 'Consumption');
        yield updateSheet(sheets, spreadsheetId, 'Consumption', consumptionSheetData);
        console.log('✅ Updated Consumption sheet');
        // Step 5: Create purchases sheet data
        const purchasesSheetData = createSheetData(purchasesByProduct, allMonths, 'Purchases');
        yield updateSheet(sheets, spreadsheetId, 'Purchases', purchasesSheetData);
        console.log('✅ Updated Purchases sheet');
        // Step 6: Create combined view
        const combinedData = createCombinedView(consumptionByProduct, purchasesByProduct, allMonths);
        yield updateSheet(sheets, spreadsheetId, 'Combined View', combinedData);
        console.log('✅ Updated Combined View');
        // Step 7: Apply formatting
        yield applyFormatting(sheets, spreadsheetId);
        console.log('✅ Applied formatting');
        // Step 8: Share with service account
        console.log(`\n📤 Share this sheet with: ${process.env.GOOGLE_SHEETS_SERVICE_EMAIL}`);
        console.log(`🔗 Open sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
        // Save the spreadsheet ID
        fs.appendFileSync('.env', `\nGOOGLE_SHEETS_ID=${spreadsheetId}\n`);
        console.log('\n✅ Added GOOGLE_SHEETS_ID to .env file');
    });
}
function transformToWideFormat(data) {
    const result = new Map();
    data.forEach(item => {
        if (!result.has(item.artisCode)) {
            result.set(item.artisCode, { artisCode: item.artisCode });
        }
        const row = result.get(item.artisCode);
        // Sum if multiple entries for same month
        row[item.month] = (row[item.month] || 0) + item.value;
    });
    return result;
}
function getUniqueMonths(dates) {
    const months = new Set();
    dates.forEach(date => {
        if (date && !isNaN(date.getTime())) {
            months.add(date.toISOString().slice(0, 7));
        }
    });
    return Array.from(months).sort();
}
function createSheetData(productData, allMonths, type) {
    // Header row
    const headers = ['Artis Code', ...allMonths.map(month => {
            const [year, monthNum] = month.split('-');
            const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            return monthName;
        })];
    // Data rows
    const rows = [headers];
    // Sort products by artis code
    const sortedProducts = Array.from(productData.values()).sort((a, b) => a.artisCode.localeCompare(b.artisCode));
    sortedProducts.forEach(product => {
        const row = [product.artisCode];
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
function createCombinedView(consumption, purchases, allMonths) {
    const headers = ['Artis Code'];
    // Create headers with C- for consumption and P- for purchases
    allMonths.forEach(month => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        headers.push(`C-${monthName}`, `P-${monthName}`);
    });
    const rows = [headers];
    // Get all unique artis codes
    const allCodes = new Set([...consumption.keys(), ...purchases.keys()]);
    const sortedCodes = Array.from(allCodes).sort();
    sortedCodes.forEach(code => {
        const row = [code];
        const consData = consumption.get(code);
        const purchData = purchases.get(code);
        allMonths.forEach(month => {
            row.push((consData === null || consData === void 0 ? void 0 : consData[month]) || 0, (purchData === null || purchData === void 0 ? void 0 : purchData[month]) || 0);
        });
        rows.push(row);
    });
    return rows;
}
function updateSheet(sheets, spreadsheetId, sheetName, data) {
    return __awaiter(this, void 0, void 0, function* () {
        yield sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: data },
        });
    });
}
function applyFormatting(sheets, spreadsheetId) {
    return __awaiter(this, void 0, void 0, function* () {
        const sheetIds = yield getSheetIds(sheets, spreadsheetId);
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
        yield sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests },
        });
    });
}
function getSheetIds(sheets, spreadsheetId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const response = yield sheets.spreadsheets.get({ spreadsheetId });
        const result = {};
        (_a = response.data.sheets) === null || _a === void 0 ? void 0 : _a.forEach(sheet => {
            var _a;
            if (((_a = sheet.properties) === null || _a === void 0 ? void 0 : _a.title) && sheet.properties.sheetId != null) {
                result[sheet.properties.title] = sheet.properties.sheetId;
            }
        });
        return result;
    });
}
// Run the script
if (require.main === module) {
    createConsolidatedSheet().catch(console.error);
}
