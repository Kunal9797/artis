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
exports.ExcelConsolidator = void 0;
const XLSX = __importStar(require("xlsx"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class ExcelConsolidator {
    constructor(dataPath = '/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data') {
        this.dataPath = dataPath;
    }
    /**
     * Parse various date formats found in Excel files
     */
    parseDate(dateValue) {
        if (!dateValue)
            return null;
        // Handle Excel serial numbers
        if (typeof dateValue === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            return new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        }
        // Handle string dates
        if (typeof dateValue === 'string') {
            // Try different date formats
            const formats = [
                /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // DD/MM/YY or MM/DD/YY
                /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
            ];
            for (const format of formats) {
                const match = dateValue.match(format);
                if (match) {
                    // Assume DD/MM/YY for consumption, MM/DD/YY for purchases
                    // This is based on the analysis
                    return new Date(dateValue);
                }
            }
        }
        return null;
    }
    /**
     * Consolidate all consumption files
     */
    consolidateConsumption() {
        return __awaiter(this, void 0, void 0, function* () {
            const consumptionPath = path.join(this.dataPath, 'Consumption');
            const files = fs.readdirSync(consumptionPath).filter(f => f.endsWith('.xlsx'));
            const allData = [];
            for (const file of files) {
                const filePath = path.join(consumptionPath, file);
                const workbook = XLSX.readFile(filePath);
                const sheet = workbook.Sheets['Inventory'] || workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                // Skip header row and date row
                for (let i = 2; i < data.length; i++) {
                    const row = data[i];
                    if (!row[1])
                        continue; // Skip empty rows
                    const designCode = String(row[1]);
                    // Process monthly columns (starting from column 2)
                    for (let j = 2; j < row.length; j++) {
                        if (row[j] && Number(row[j]) > 0) {
                            // Get date from second row (row index 1)
                            const dateValue = data[1][j];
                            const date = this.parseDate(dateValue);
                            if (date) {
                                allData.push({
                                    designCode,
                                    date,
                                    quantity: Number(row[j]),
                                    source: file
                                });
                            }
                        }
                    }
                }
            }
            return allData;
        });
    }
    /**
     * Consolidate all purchase files
     */
    consolidatePurchases() {
        return __awaiter(this, void 0, void 0, function* () {
            const purchasePath = path.join(this.dataPath, 'Purchase');
            const files = fs.readdirSync(purchasePath).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
            const allData = [];
            for (const file of files) {
                const filePath = path.join(purchasePath, file);
                const workbook = XLSX.readFile(filePath);
                const sheet = workbook.Sheets['Purchase Order'] || workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet);
                for (const row of data) {
                    const artisCode = String(row['Artis Code'] || row['ARTIS CODE'] || '');
                    const dateValue = row['Date'] || row['DATE'];
                    const amount = Number(row['Amount (Kgs)'] || row['AMOUNT (KGS)'] || 0);
                    const notes = String(row['Notes'] || row['NOTES'] || '');
                    const date = this.parseDate(dateValue);
                    if (date && artisCode && amount > 0) {
                        allData.push({
                            artisCode,
                            date,
                            amount,
                            notes: notes || undefined,
                            source: file
                        });
                    }
                }
            }
            return allData;
        });
    }
    /**
     * Create standardized Excel template
     */
    createStandardizedTemplates() {
        const templatesPath = path.join(this.dataPath, 'Templates');
        if (!fs.existsSync(templatesPath)) {
            fs.mkdirSync(templatesPath, { recursive: true });
        }
        // Consumption Template
        const consumptionWB = XLSX.utils.book_new();
        const consumptionData = [
            ['Design Code', 'Date', 'Quantity (Kgs)', 'Notes'],
            ['Example: 101', '2025-01-15', '100', 'Monthly consumption'],
            ['Example: 102', '2025-01-15', '50', 'Monthly consumption']
        ];
        const consumptionWS = XLSX.utils.aoa_to_sheet(consumptionData);
        XLSX.utils.book_append_sheet(consumptionWB, consumptionWS, 'Consumption');
        XLSX.writeFile(consumptionWB, path.join(templatesPath, 'consumption_template.xlsx'));
        // Purchase Template
        const purchaseWB = XLSX.utils.book_new();
        const purchaseData = [
            ['Artis Code', 'Date', 'Amount (Kgs)', 'Supplier', 'Notes'],
            ['Example: 101', '2025-01-15', '500', 'Supplier A', 'Purchase order #123'],
            ['Example: 102', '2025-01-15', '300', 'Supplier B', 'Purchase order #124']
        ];
        const purchaseWS = XLSX.utils.aoa_to_sheet(purchaseData);
        XLSX.utils.book_append_sheet(purchaseWB, purchaseWS, 'Purchases');
        XLSX.writeFile(purchaseWB, path.join(templatesPath, 'purchase_template.xlsx'));
    }
    /**
     * Export consolidated data to a single Excel file
     */
    exportConsolidatedExcel(outputPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const consumption = yield this.consolidateConsumption();
            const purchases = yield this.consolidatePurchases();
            const workbook = XLSX.utils.book_new();
            // Consumption sheet
            const consumptionData = [
                ['Design Code', 'Date', 'Quantity (Kgs)', 'Source File'],
                ...consumption.map(c => [
                    c.designCode,
                    c.date.toISOString().split('T')[0],
                    c.quantity,
                    c.source
                ])
            ];
            const consumptionSheet = XLSX.utils.aoa_to_sheet(consumptionData);
            XLSX.utils.book_append_sheet(workbook, consumptionSheet, 'Consolidated Consumption');
            // Purchases sheet
            const purchaseData = [
                ['Artis Code', 'Date', 'Amount (Kgs)', 'Notes', 'Source File'],
                ...purchases.map(p => [
                    p.artisCode,
                    p.date.toISOString().split('T')[0],
                    p.amount,
                    p.notes || '',
                    p.source
                ])
            ];
            const purchaseSheet = XLSX.utils.aoa_to_sheet(purchaseData);
            XLSX.utils.book_append_sheet(workbook, purchaseSheet, 'Consolidated Purchases');
            XLSX.writeFile(workbook, outputPath);
        });
    }
    /**
     * Generate summary report
     */
    generateSummaryReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const consumption = yield this.consolidateConsumption();
            const purchases = yield this.consolidatePurchases();
            const report = {
                totalConsumptionRecords: consumption.length,
                totalPurchaseRecords: purchases.length,
                dateRange: {
                    earliest: new Date(Math.min(...[...consumption, ...purchases].map(r => r.date.getTime()))),
                    latest: new Date(Math.max(...[...consumption, ...purchases].map(r => r.date.getTime())))
                },
                uniqueDesignCodes: new Set(consumption.map(c => c.designCode)).size,
                totalConsumptionKgs: consumption.reduce((sum, c) => sum + c.quantity, 0),
                totalPurchaseKgs: purchases.reduce((sum, p) => sum + p.amount, 0),
                sourceFiles: {
                    consumption: new Set(consumption.map(c => c.source)).size,
                    purchases: new Set(purchases.map(p => p.source)).size
                }
            };
            return JSON.stringify(report, null, 2);
        });
    }
}
exports.ExcelConsolidator = ExcelConsolidator;
