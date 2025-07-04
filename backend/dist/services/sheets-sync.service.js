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
exports.SheetsSyncService = void 0;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
class SheetsSyncService {
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    /**
     * Pull data from Google Sheets and sync to Supabase
     */
    syncFromSheets() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = {
                added: 0,
                updated: 0,
                errors: []
            };
            try {
                // Get data from Google Sheets
                const sheetData = yield this.sheetsService.getInventorySnapshot();
                // Skip header row
                const dataRows = sheetData.slice(1);
                for (const row of dataRows) {
                    try {
                        const [artisCode, month, consumption, purchases] = row;
                        if (!artisCode || !month)
                            continue;
                        // Find product
                        const product = yield models_1.Product.findOne({
                            where: { artisCodes: { [sequelize_1.Op.contains]: [artisCode] } }
                        });
                        if (!product) {
                            results.errors.push(`Product not found: ${artisCode}`);
                            continue;
                        }
                        // Parse month (YYYY-MM format)
                        const [year, monthNum] = month.split('-');
                        const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
                        const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
                        // Check existing transactions for this month
                        const existingTransactions = yield models_1.Transaction.findAll({
                            where: {
                                productId: product.id,
                                date: {
                                    [sequelize_1.Op.gte]: startDate,
                                    [sequelize_1.Op.lte]: endDate
                                }
                            }
                        });
                        // Add consumption if not exists
                        if (consumption > 0) {
                            const hasConsumption = existingTransactions.some(t => t.type === 'OUT');
                            if (!hasConsumption) {
                                yield models_1.Transaction.create({
                                    productId: product.id,
                                    type: 'OUT',
                                    quantity: parseFloat(consumption),
                                    date: endDate, // Use month end for consumption
                                    notes: 'Imported from Google Sheets'
                                });
                                results.added++;
                            }
                        }
                        // Add purchases if not exists
                        if (purchases > 0) {
                            const hasPurchase = existingTransactions.some(t => t.type === 'IN');
                            if (!hasPurchase) {
                                yield models_1.Transaction.create({
                                    productId: product.id,
                                    type: 'IN',
                                    quantity: parseFloat(purchases),
                                    date: new Date(parseInt(year), parseInt(monthNum) - 1, 15), // Mid-month for purchases
                                    notes: 'Imported from Google Sheets'
                                });
                                results.added++;
                            }
                        }
                    }
                    catch (error) {
                        results.errors.push(`Error processing row: ${error}`);
                    }
                }
                return results;
            }
            catch (error) {
                throw new Error(`Sync failed: ${error}`);
            }
        });
    }
    /**
     * Export current month's template to Google Sheets
     */
    exportMonthlyTemplate() {
        return __awaiter(this, void 0, void 0, function* () {
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            // Get all products
            const products = yield models_1.Product.findAll({
                order: [['artisCodes', 'ASC']]
            });
            // Create template data
            const templateData = [
                ['Artis Code', 'Month', 'Consumption', 'Purchases', 'Notes'],
                ...products.map(p => [
                    p.artisCodes[0],
                    currentMonth,
                    '', // Empty for user to fill
                    '', // Empty for user to fill
                    ''
                ])
            ];
            // Update sheet
            yield this.sheetsService.updateInventoryData(templateData, 'Monthly Entry');
        });
    }
    /**
     * Create monthly summary in Google Sheets
     */
    createMonthlySummary() {
        return __awaiter(this, void 0, void 0, function* () {
            // Get last 12 months of data
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 12);
            const transactions = yield models_1.Transaction.findAll({
                where: {
                    date: { [sequelize_1.Op.gte]: startDate }
                },
                include: [models_1.Product],
                order: [['date', 'ASC']]
            });
            // Aggregate by month and product
            const monthlyData = new Map();
            transactions.forEach(transaction => {
                const product = transaction.product;
                const monthKey = transaction.date.toISOString().slice(0, 7);
                const key = `${product.artisCodes[0]}-${monthKey}`;
                if (!monthlyData.has(key)) {
                    monthlyData.set(key, {
                        artisCode: product.artisCodes[0],
                        month: monthKey,
                        consumption: 0,
                        purchases: 0
                    });
                }
                const data = monthlyData.get(key);
                if (transaction.type === 'OUT') {
                    data.consumption += transaction.quantity;
                }
                else if (transaction.type === 'IN') {
                    data.purchases += transaction.quantity;
                }
            });
            // Convert to array and sort
            const summaryData = Array.from(monthlyData.values())
                .sort((a, b) => {
                if (a.month !== b.month)
                    return a.month.localeCompare(b.month);
                return a.artisCode.localeCompare(b.artisCode);
            });
            // Update sheet
            const sheetData = [
                ['Artis Code', 'Month', 'Total Consumption', 'Total Purchases'],
                ...summaryData.map(d => [
                    d.artisCode,
                    d.month,
                    d.consumption,
                    d.purchases
                ])
            ];
            yield this.sheetsService.updateInventoryData(sheetData, 'Monthly Summary');
        });
    }
}
exports.SheetsSyncService = SheetsSyncService;
