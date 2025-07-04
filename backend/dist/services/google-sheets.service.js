"use strict";
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
exports.GoogleSheetsService = void 0;
const googleapis_1 = require("googleapis");
class GoogleSheetsService {
    constructor(config) {
        this.spreadsheetId = config.spreadsheetId;
        // Initialize Google Sheets API
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials: config.credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.sheets = googleapis_1.google.sheets({ version: 'v4', auth });
    }
    /**
     * Create a new spreadsheet with initial structure
     */
    createInventorySpreadsheet(title) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.sheets.spreadsheets.create({
                    requestBody: {
                        properties: {
                            title: `${title} - Artis Inventory`,
                        },
                        sheets: [
                            {
                                properties: {
                                    title: 'Live Inventory',
                                    gridProperties: { frozenRowCount: 1 },
                                },
                            },
                            {
                                properties: {
                                    title: 'Consumption',
                                    gridProperties: { frozenRowCount: 1 },
                                },
                            },
                            {
                                properties: {
                                    title: 'Purchases',
                                    gridProperties: { frozenRowCount: 1 },
                                },
                            },
                            {
                                properties: {
                                    title: 'Monthly Summary',
                                    gridProperties: { frozenRowCount: 1 },
                                },
                            },
                        ],
                    },
                });
                return response.data.spreadsheetId || '';
            }
            catch (error) {
                console.error('Error creating spreadsheet:', error);
                throw error;
            }
        });
    }
    /**
     * Update inventory data in Google Sheets
     */
    updateInventoryData(data, sheetName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: data,
                    },
                });
            }
            catch (error) {
                console.error('Error updating sheet:', error);
                throw error;
            }
        });
    }
    /**
     * Append new consumption entries
     */
    appendConsumption(entries) {
        return __awaiter(this, void 0, void 0, function* () {
            const values = entries.map(e => [
                e.designCode,
                e.date,
                e.quantity,
                e.notes || ''
            ]);
            try {
                yield this.sheets.spreadsheets.values.append({
                    spreadsheetId: this.spreadsheetId,
                    range: 'Consumption!A:D',
                    valueInputOption: 'USER_ENTERED',
                    insertDataOption: 'INSERT_ROWS',
                    requestBody: {
                        values,
                    },
                });
            }
            catch (error) {
                console.error('Error appending consumption:', error);
                throw error;
            }
        });
    }
    /**
     * Append new purchase entries
     */
    appendPurchases(entries) {
        return __awaiter(this, void 0, void 0, function* () {
            const values = entries.map(e => [
                e.artisCode,
                e.date,
                e.amount,
                e.supplier || '',
                e.notes || ''
            ]);
            try {
                yield this.sheets.spreadsheets.values.append({
                    spreadsheetId: this.spreadsheetId,
                    range: 'Purchases!A:E',
                    valueInputOption: 'USER_ENTERED',
                    insertDataOption: 'INSERT_ROWS',
                    requestBody: {
                        values,
                    },
                });
            }
            catch (error) {
                console.error('Error appending purchases:', error);
                throw error;
            }
        });
    }
    /**
     * Get current inventory snapshot
     */
    getInventorySnapshot() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.sheets.spreadsheets.values.get({
                    spreadsheetId: this.spreadsheetId,
                    range: 'Live Inventory!A:Z',
                });
                return response.data.values || [];
            }
            catch (error) {
                console.error('Error getting inventory:', error);
                throw error;
            }
        });
    }
    /**
     * Create monthly summary with formulas
     */
    createMonthlySummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const summaryFormulas = [
                ['Month', 'Total Consumption', 'Total Purchases', 'Net Change', 'Running Stock'],
                ['=UNIQUE(TEXT(Consumption!B2:B,"MMM-YYYY"))',
                    '=SUMIF(TEXT(Consumption!B:B,"MMM-YYYY"),A2,Consumption!C:C)',
                    '=SUMIF(TEXT(Purchases!B:B,"MMM-YYYY"),A2,Purchases!C:C)',
                    '=C2-B2',
                    '=E1+D2'
                ]
            ];
            try {
                yield this.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: 'Monthly Summary!A1',
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: summaryFormulas,
                    },
                });
                // Auto-fill formulas
                yield this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: {
                        requests: [{
                                autoFill: {
                                    range: {
                                        sheetId: yield this.getSheetId('Monthly Summary'),
                                        startRowIndex: 1,
                                        endRowIndex: 50,
                                        startColumnIndex: 0,
                                        endColumnIndex: 5,
                                    },
                                    useAlternateSeries: false,
                                },
                            }],
                    },
                });
            }
            catch (error) {
                console.error('Error creating summary:', error);
                throw error;
            }
        });
    }
    /**
     * Set up data validation rules
     */
    setupDataValidation() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requests = [
                    // Date validation for Consumption sheet
                    {
                        setDataValidation: {
                            range: {
                                sheetId: yield this.getSheetId('Consumption'),
                                startRowIndex: 1,
                                startColumnIndex: 1,
                                endColumnIndex: 2,
                            },
                            rule: {
                                condition: {
                                    type: 'DATE_IS_VALID',
                                },
                                inputMessage: 'Enter date in format: YYYY-MM-DD',
                                strict: true,
                                showCustomUi: true,
                            },
                        },
                    },
                    // Positive number validation for quantities
                    {
                        setDataValidation: {
                            range: {
                                sheetId: yield this.getSheetId('Consumption'),
                                startRowIndex: 1,
                                startColumnIndex: 2,
                                endColumnIndex: 3,
                            },
                            rule: {
                                condition: {
                                    type: 'NUMBER_GREATER',
                                    values: [{ userEnteredValue: '0' }],
                                },
                                inputMessage: 'Enter positive quantity in Kgs',
                                strict: true,
                                showCustomUi: true,
                            },
                        },
                    },
                ];
                yield this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: { requests },
                });
            }
            catch (error) {
                console.error('Error setting up validation:', error);
                throw error;
            }
        });
    }
    /**
     * Get sheet ID by name
     */
    getSheetId(sheetName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const response = yield this.sheets.spreadsheets.get({
                    spreadsheetId: this.spreadsheetId,
                });
                const sheet = (_a = response.data.sheets) === null || _a === void 0 ? void 0 : _a.find(s => { var _a; return ((_a = s.properties) === null || _a === void 0 ? void 0 : _a.title) === sheetName; });
                return ((_b = sheet === null || sheet === void 0 ? void 0 : sheet.properties) === null || _b === void 0 ? void 0 : _b.sheetId) || 0;
            }
            catch (error) {
                console.error('Error getting sheet ID:', error);
                throw error;
            }
        });
    }
    /**
     * Apply conditional formatting for better visualization
     */
    applyConditionalFormatting() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requests = [
                    // Highlight high consumption (>1000 kgs) in red
                    {
                        addConditionalFormatRule: {
                            rule: {
                                ranges: [{
                                        sheetId: yield this.getSheetId('Consumption'),
                                        startRowIndex: 1,
                                        startColumnIndex: 2,
                                        endColumnIndex: 3,
                                    }],
                                booleanRule: {
                                    condition: {
                                        type: 'NUMBER_GREATER',
                                        values: [{ userEnteredValue: '1000' }],
                                    },
                                    format: {
                                        backgroundColor: { red: 1, green: 0.8, blue: 0.8 },
                                    },
                                },
                            },
                            index: 0,
                        },
                    },
                    // Highlight low stock items
                    {
                        addConditionalFormatRule: {
                            rule: {
                                ranges: [{
                                        sheetId: yield this.getSheetId('Live Inventory'),
                                        startRowIndex: 1,
                                        startColumnIndex: 2,
                                        endColumnIndex: 3,
                                    }],
                                booleanRule: {
                                    condition: {
                                        type: 'NUMBER_LESS',
                                        values: [{ userEnteredValue: '100' }],
                                    },
                                    format: {
                                        backgroundColor: { red: 1, green: 1, blue: 0.8 },
                                        textFormat: { bold: true },
                                    },
                                },
                            },
                            index: 1,
                        },
                    },
                ];
                yield this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    requestBody: { requests },
                });
            }
            catch (error) {
                console.error('Error applying formatting:', error);
                throw error;
            }
        });
    }
}
exports.GoogleSheetsService = GoogleSheetsService;
