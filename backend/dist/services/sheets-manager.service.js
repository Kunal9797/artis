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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsManagerService = void 0;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
dotenv.config();
class SheetsManagerService {
    constructor() {
        this.initialStockSheetId = process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID;
        const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH, 'utf8'));
        this.auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.sheets = googleapis_1.google.sheets({ version: 'v4', auth: this.auth });
    }
    /**
     * Setup consumption sheet with template
     */
    setupConsumptionSheet() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📊 Setting up Consumption sheet...');
            const products = yield models_1.Product.findAll({
                order: [['artisCodes', 'ASC']],
                attributes: ['artisCodes']
            });
            const currentMonth = new Date().toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
            const template = [
                ['Artis Code', 'Consumption (kg)', 'Month', 'Notes'],
                ...products.map(p => [
                    p.artisCodes[0] || '',
                    '', // Empty for user to fill
                    currentMonth,
                    ''
                ])
            ];
            yield this.sheets.spreadsheets.values.update({
                spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: template },
            });
            console.log('✅ Consumption sheet ready');
        });
    }
    /**
     * Setup purchases sheet with template
     */
    setupPurchasesSheet() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📊 Setting up Purchases sheet...');
            const template = [
                ['Artis Code', 'Date', 'Amount (kg)', 'Notes'],
                ['Example: 101', '2025-01-15', '500', 'PO #123'],
                ['', '', '', ''],
                ['Instructions:', '', '', ''],
                ['1. Enter date as YYYY-MM-DD', '', '', ''],
                ['2. One row per purchase transaction', '', '', ''],
                ['3. Multiple purchases for same product are OK', '', '', '']
            ];
            yield this.sheets.spreadsheets.values.update({
                spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: template },
            });
            console.log('✅ Purchases sheet ready');
        });
    }
    /**
     * Setup initial stock sheet with template
     */
    setupInitialStockSheet() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📊 Setting up Initial Stock sheet...');
            const products = yield models_1.Product.findAll({
                order: [['artisCodes', 'ASC']],
                attributes: ['id', 'artisCodes', 'currentStock']
            });
            const template = [
                ['Artis Code', 'Initial Stock (kg)', 'Date', 'Notes'],
                ...products.map(p => [
                    p.artisCodes[0] || '',
                    '', // Empty for user to fill
                    new Date().toISOString().split('T')[0],
                    'Set initial stock value'
                ]),
                ['', '', '', ''],
                ['Instructions:', '', '', ''],
                ['1. Enter Initial Stock to set opening balance', '', '', ''],
                ['2. Date is when the initial stock is recorded', '', '', ''],
                ['3. This will create an opening balance transaction', '', '', ''],
                ['4. Use this ONLY for initial setup', '', '', '']
            ];
            yield this.sheets.spreadsheets.values.update({
                spreadsheetId: this.initialStockSheetId,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: template },
            });
            console.log('✅ Initial Stock sheet ready');
        });
    }
    /**
     * Setup corrections sheet with template
     */
    setupCorrectionsSheet() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('📊 Setting up Corrections sheet...');
            const template = [
                ['Artis Code', 'Correction Amount', 'Type', 'Date Applied', 'Reason'],
                ['Example: 101', '+50', 'Stock Adjustment', '2025-01-15', 'Found extra stock'],
                ['Example: 102', '-30', 'Damaged Goods', '2025-01-15', 'Water damage'],
                ['', '', '', '', ''],
                ['Instructions:', '', '', '', ''],
                ['1. Use + for adding stock (e.g., +100)', '', '', '', ''],
                ['2. Use - for removing stock (e.g., -50)', '', '', '', ''],
                ['3. Type can be: Stock Adjustment, Damaged Goods, Data Error, etc.', '', '', '', ''],
                ['4. Date Applied is when the correction should be recorded', '', '', '', '']
            ];
            yield this.sheets.spreadsheets.values.update({
                spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: template },
            });
            console.log('✅ Corrections sheet ready');
        });
    }
    /**
     * Sync consumption data from sheet to database
     */
    syncConsumption() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Syncing consumption data...');
            const response = yield this.sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
                range: 'Sheet1!A2:D', // Skip header row
            });
            const rows = response.data.values || [];
            let added = 0;
            const errors = [];
            for (const row of rows) {
                try {
                    const [artisCode, consumption, month, notes] = row;
                    if (!artisCode || !consumption || !month)
                        continue;
                    // Find product
                    const product = yield models_1.Product.findOne({
                        where: {
                            artisCodes: {
                                [sequelize_1.Op.contains]: [artisCode]
                            }
                        }
                    });
                    if (!product) {
                        errors.push(`Product not found: ${artisCode}`);
                        continue;
                    }
                    // Parse month to get last day
                    const monthDate = new Date(`${month} 1`);
                    const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                    // Create consumption transaction
                    yield models_1.Transaction.create({
                        productId: product.id,
                        type: 'OUT',
                        quantity: parseFloat(consumption),
                        date: lastDay,
                        notes: notes || `Monthly consumption for ${month}`
                    });
                    added++;
                }
                catch (error) {
                    errors.push(`Error processing row: ${error.message}`);
                }
            }
            console.log(`✅ Added ${added} consumption records`);
            return { added, errors };
        });
    }
    /**
     * Sync purchases data from sheet to database
     */
    syncPurchases() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Syncing purchases data...');
            const response = yield this.sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID,
                range: 'Sheet1!A2:E', // Skip header row
            });
            const rows = response.data.values || [];
            let added = 0;
            const errors = [];
            for (const row of rows) {
                try {
                    const [artisCode, date, amount, supplier, notes] = row;
                    // Skip example and instruction rows
                    if (!artisCode || artisCode.includes('Example:') || artisCode.includes('Instructions:'))
                        continue;
                    if (!amount || !date)
                        continue;
                    // Find product
                    const product = yield models_1.Product.findOne({
                        where: {
                            artisCodes: {
                                [sequelize_1.Op.contains]: [artisCode]
                            }
                        }
                    });
                    if (!product) {
                        errors.push(`Product not found: ${artisCode}`);
                        continue;
                    }
                    // Create purchase transaction
                    yield models_1.Transaction.create({
                        productId: product.id,
                        type: 'IN',
                        quantity: parseFloat(amount),
                        date: new Date(date),
                        notes: `${supplier ? `Supplier: ${supplier}. ` : ''}${notes || ''}`
                    });
                    added++;
                }
                catch (error) {
                    errors.push(`Error processing row: ${error.message}`);
                }
            }
            console.log(`✅ Added ${added} purchase records`);
            return { added, errors };
        });
    }
    /**
     * Sync initial stock data from sheet to database
     */
    syncInitialStock() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Syncing initial stock data...');
            const response = yield this.sheets.spreadsheets.values.get({
                spreadsheetId: this.initialStockSheetId,
                range: 'Sheet1!A2:D', // Skip header row
            });
            const rows = response.data.values || [];
            let added = 0;
            const errors = [];
            // Use transaction to ensure atomicity
            const t = yield sequelize_2.default.transaction();
            try {
                for (const row of rows) {
                    const [artisCode, initialStock, date, notes] = row;
                    // Skip instruction rows
                    if (!artisCode || artisCode.includes('Instructions:') || !initialStock)
                        continue;
                    // Find product
                    const product = yield models_1.Product.findOne({
                        where: {
                            artisCodes: {
                                [sequelize_1.Op.contains]: [artisCode]
                            }
                        },
                        transaction: t
                    });
                    if (!product) {
                        errors.push(`Product not found: ${artisCode}`);
                        continue;
                    }
                    const initialStockValue = parseFloat(initialStock);
                    const currentStockValue = product.currentStock || 0;
                    // Calculate the difference to apply
                    const difference = initialStockValue - currentStockValue;
                    if (difference !== 0) {
                        // Create initial stock transaction
                        yield models_1.Transaction.create({
                            productId: product.id,
                            type: difference > 0 ? 'IN' : 'OUT',
                            quantity: Math.abs(difference),
                            date: date ? new Date(date) : new Date(),
                            notes: `INITIAL STOCK: Set to ${initialStockValue} kg. ${notes || ''}`,
                            operationId: `INIT-${Date.now()}`
                        }, { transaction: t });
                        // Update product stock
                        yield product.update({
                            currentStock: initialStockValue
                        }, { transaction: t });
                        added++;
                    }
                }
                yield t.commit();
                console.log(`✅ Set initial stock for ${added} products`);
                return { added, errors };
            }
            catch (error) {
                yield t.rollback();
                throw error;
            }
        });
    }
    /**
     * Sync corrections data from sheet to database
     */
    syncCorrections() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Syncing corrections data...');
            const response = yield this.sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID,
                range: 'Sheet1!A2:E', // Skip header row
            });
            const rows = response.data.values || [];
            let added = 0;
            const errors = [];
            for (const row of rows) {
                try {
                    const [artisCode, correctionAmount, type, dateApplied, reason] = row;
                    // Skip example and instruction rows
                    if (!artisCode || artisCode.includes('Example:') || artisCode.includes('Instructions:'))
                        continue;
                    if (!correctionAmount)
                        continue;
                    // Find product
                    const product = yield models_1.Product.findOne({
                        where: {
                            artisCodes: {
                                [sequelize_1.Op.contains]: [artisCode]
                            }
                        }
                    });
                    if (!product) {
                        errors.push(`Product not found: ${artisCode}`);
                        continue;
                    }
                    // Parse correction amount (+100 or -50)
                    const amount = parseFloat(correctionAmount.replace(/[^0-9.-]/g, ''));
                    const isPositive = correctionAmount.includes('+') || amount > 0;
                    // Create correction transaction
                    yield models_1.Transaction.create({
                        productId: product.id,
                        type: isPositive ? 'IN' : 'OUT',
                        quantity: Math.abs(amount),
                        date: dateApplied ? new Date(dateApplied) : new Date(),
                        notes: `CORRECTION: ${type || 'Stock Adjustment'}. ${reason || ''}`,
                        operationId: `CORR-${Date.now()}` // Unique ID for corrections
                    });
                    // Update product current stock directly
                    const currentStock = product.currentStock || 0;
                    const newStock = isPositive ? currentStock + Math.abs(amount) : currentStock - Math.abs(amount);
                    yield product.update({
                        currentStock: Math.max(0, newStock) // Don't go negative
                    });
                    added++;
                }
                catch (error) {
                    errors.push(`Error processing correction: ${error.message}`);
                }
            }
            console.log(`✅ Applied ${added} corrections`);
            return { added, errors };
        });
    }
    /**
     * Archive synced data to a timestamped tab instead of clearing
     */
    archiveSheet(sheetType) {
        return __awaiter(this, void 0, void 0, function* () {
            const sheetIds = {
                consumption: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
                purchases: process.env.GOOGLE_SHEETS_PURCHASES_ID,
                corrections: process.env.GOOGLE_SHEETS_CORRECTIONS_ID,
                initialStock: this.initialStockSheetId
            };
            const spreadsheetId = sheetIds[sheetType];
            // Create archive tab name with timestamp
            const now = new Date();
            const archiveTabName = `Archive_${now.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
            })}_${now.getDate()}_${now.getHours()}${now.getMinutes()}`;
            try {
                // 1. Get all data from current sheet
                const dataResponse = yield this.sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: 'Sheet1!A1:Z1000',
                });
                const data = dataResponse.data.values || [];
                if (data.length <= 1) {
                    console.log(`📊 No data to archive in ${sheetType} sheet`);
                    return;
                }
                // 2. Create new archive sheet
                yield this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                                addSheet: {
                                    properties: {
                                        title: archiveTabName,
                                        gridProperties: {
                                            rowCount: data.length + 100,
                                            columnCount: 26
                                        }
                                    }
                                }
                            }]
                    }
                });
                // 3. Copy data to archive sheet
                yield this.sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `${archiveTabName}!A1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: data
                    }
                });
                // 4. Clear original sheet (keep header)
                yield this.sheets.spreadsheets.values.clear({
                    spreadsheetId,
                    range: 'Sheet1!A2:Z1000',
                });
                console.log(`📦 Archived ${data.length - 1} rows to ${archiveTabName}`);
            }
            catch (error) {
                console.error(`Error archiving ${sheetType} sheet:`, error);
                throw error;
            }
        });
    }
    /**
     * Clear a sheet after successful sync (optional)
     * @deprecated Use archiveSheet instead
     */
    clearSheet(sheetType) {
        return __awaiter(this, void 0, void 0, function* () {
            // Redirect to archive functionality
            yield this.archiveSheet(sheetType);
        });
    }
    /**
     * Get list of archive tabs for a sheet
     */
    getArchiveTabs(sheetType) {
        return __awaiter(this, void 0, void 0, function* () {
            const sheetIds = {
                consumption: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
                purchases: process.env.GOOGLE_SHEETS_PURCHASES_ID,
                corrections: process.env.GOOGLE_SHEETS_CORRECTIONS_ID,
                initialStock: this.initialStockSheetId
            };
            try {
                const response = yield this.sheets.spreadsheets.get({
                    spreadsheetId: sheetIds[sheetType],
                    fields: 'sheets.properties.title'
                });
                const sheets = response.data.sheets || [];
                return sheets
                    .map(sheet => { var _a; return ((_a = sheet.properties) === null || _a === void 0 ? void 0 : _a.title) || ''; })
                    .filter(title => title.startsWith('Archive_'))
                    .sort((a, b) => b.localeCompare(a)); // Most recent first
            }
            catch (error) {
                console.error(`Error getting archive tabs for ${sheetType}:`, error);
                return [];
            }
        });
    }
    /**
     * Get summary of pending data in sheets
     */
    getPendingSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const [consResp, purchResp, corrResp, initResp] = yield Promise.all([
                this.sheets.spreadsheets.values.get({
                    spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
                    range: 'Sheet1!A2:A',
                }),
                this.sheets.spreadsheets.values.get({
                    spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID,
                    range: 'Sheet1!A2:A',
                }),
                this.sheets.spreadsheets.values.get({
                    spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID,
                    range: 'Sheet1!A2:A',
                }),
                this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.initialStockSheetId,
                    range: 'Sheet1!A2:A',
                })
            ]);
            return {
                consumption: (consResp.data.values || []).filter(row => row[0] && !row[0].includes('Example:')).length,
                purchases: (purchResp.data.values || []).filter(row => row[0] && !row[0].includes('Example:')).length,
                corrections: (corrResp.data.values || []).filter(row => row[0] && !row[0].includes('Example:')).length,
                initialStock: (initResp.data.values || []).filter(row => row[0] && !row[0].includes('Instructions:')).length
            };
        });
    }
}
exports.SheetsManagerService = SheetsManagerService;
