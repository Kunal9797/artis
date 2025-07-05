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
exports.testAndMigrateGuide = testAndMigrateGuide;
const sheets_manager_service_1 = require("../services/sheets-manager.service");
const models_1 = require("../models");
const sequelize_1 = __importDefault(require("../config/sequelize"));
const dotenv = __importStar(require("dotenv"));
const sequelize_2 = require("sequelize");
dotenv.config();
// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};
function testAndMigrateGuide() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`\n${colors.bright}${colors.blue}🚀 ARTIS GOOGLE SHEETS TEST & MIGRATION GUIDE${colors.reset}\n`);
        const sheetsManager = new sheets_manager_service_1.SheetsManagerService();
        try {
            // Step 1: Test Connection
            console.log(`${colors.yellow}📋 STEP 1: Testing Database & Google Sheets Connection${colors.reset}`);
            yield sequelize_1.default.authenticate();
            console.log(`${colors.green}✅ Database connected successfully${colors.reset}`);
            const pending = yield sheetsManager.getPendingSummary();
            console.log(`${colors.green}✅ Google Sheets connected successfully${colors.reset}`);
            console.log(`Current pending items:`, pending);
            // Step 2: Setup Templates
            console.log(`\n${colors.yellow}📋 STEP 2: Setting Up Sheet Templates${colors.reset}`);
            console.log('This will create templates in your Google Sheets...\n');
            // Setup each sheet
            const setupSteps = [
                { name: 'Consumption', method: () => sheetsManager.setupConsumptionSheet() },
                { name: 'Purchases', method: () => sheetsManager.setupPurchasesSheet() },
                { name: 'Corrections', method: () => sheetsManager.setupCorrectionsSheet() },
                { name: 'Initial Stock', method: () => sheetsManager.setupInitialStockSheet() }
            ];
            for (const step of setupSteps) {
                try {
                    console.log(`Setting up ${step.name} sheet...`);
                    yield step.method();
                    console.log(`${colors.green}✅ ${step.name} sheet ready${colors.reset}`);
                }
                catch (error) {
                    console.log(`${colors.red}❌ Error setting up ${step.name}: ${error.message}${colors.reset}`);
                }
            }
            // Step 3: Show Current Data Summary
            console.log(`\n${colors.yellow}📋 STEP 3: Current Database Summary${colors.reset}`);
            const productCount = yield models_1.Product.count();
            const transactionCount = yield models_1.Transaction.count();
            const inTransactions = yield models_1.Transaction.count({ where: { type: 'IN' } });
            const outTransactions = yield models_1.Transaction.count({ where: { type: 'OUT' } });
            console.log(`\n${colors.cyan}Database Statistics:${colors.reset}`);
            console.log(`- Total Products: ${productCount}`);
            console.log(`- Total Transactions: ${transactionCount}`);
            console.log(`  - Purchases (IN): ${inTransactions}`);
            console.log(`  - Consumption (OUT): ${outTransactions}`);
            // Get date range
            const oldestTransaction = yield models_1.Transaction.findOne({ order: [['date', 'ASC']] });
            const newestTransaction = yield models_1.Transaction.findOne({ order: [['date', 'DESC']] });
            if (oldestTransaction && newestTransaction) {
                console.log(`\n${colors.cyan}Date Range:${colors.reset}`);
                console.log(`- Oldest: ${oldestTransaction.date.toLocaleDateString()}`);
                console.log(`- Newest: ${newestTransaction.date.toLocaleDateString()}`);
            }
            // Step 4: Testing Instructions
            console.log(`\n${colors.yellow}📋 STEP 4: How to Test the System${colors.reset}`);
            console.log(`
${colors.bright}A. Test Initial Stock:${colors.reset}
1. Open Initial Stock sheet: ${colors.blue}https://docs.google.com/spreadsheets/d/1jS87QQ0eoVNQF9ymrRhiROU_oEyW-1zhnN382EX1Abs${colors.reset}
2. You'll see all products with their current stock
3. Enter a test initial stock value (e.g., 1000) for product 101
4. Go to app > Google Sheets Sync > Click "Sync" on Initial Stock card
5. Check if the sync was successful

${colors.bright}B. Test Consumption:${colors.reset}
1. Open Consumption sheet: ${colors.blue}https://docs.google.com/spreadsheets/d/1hwS0u_Mcf7795WeMlX3Eez7j0J4ikR8JCz19nJvisJU${colors.reset}
2. Enter test consumption (e.g., 50 kg for product 101)
3. Sync and verify

${colors.bright}C. Test Purchases:${colors.reset}
1. Open Purchases sheet: ${colors.blue}https://docs.google.com/spreadsheets/d/1gPOqkdU6NpOC0yx6Q-tx2PZs54VDyrbip5kTUJQ13Tw${colors.reset}
2. Enter a test purchase (e.g., 101, 2025-01-15, 200, Test Supplier)
3. Sync and verify

${colors.bright}D. Test Corrections:${colors.reset}
1. Open Corrections sheet: ${colors.blue}https://docs.google.com/spreadsheets/d/1WxtUXZC4XT7K5TX--rUivk7g0tT4WCBwc7tbyksKT3w${colors.reset}
2. Enter a correction (e.g., 101, +25, Stock Adjustment)
3. Sync and verify
`);
            // Step 5: Migration Options
            console.log(`\n${colors.yellow}📋 STEP 5: Data Migration Options${colors.reset}`);
            console.log(`
${colors.bright}Option 1: Export Current Data to CSV (Recommended)${colors.reset}
Run: ${colors.cyan}npm run export-for-sheets${colors.reset}
This will create CSV files you can copy-paste into Google Sheets

${colors.bright}Option 2: Manual Migration${colors.reset}
1. Export transactions grouped by month
2. Copy consumption totals to Consumption sheet
3. Copy individual purchases to Purchases sheet

${colors.bright}Option 3: Automated Migration${colors.reset}
Run: ${colors.cyan}npm run migrate-to-sheets${colors.reset}
This will automatically populate your Google Sheets with existing data
`);
            // Show what data needs migration
            console.log(`\n${colors.yellow}📋 Data to Migrate:${colors.reset}`);
            // Get monthly consumption summary
            const consumptionByMonth = yield sequelize_1.default.query(`
      SELECT 
        DATE_TRUNC('month', date) as month,
        COUNT(DISTINCT "productId") as products,
        SUM(quantity) as total_quantity
      FROM "Transactions"
      WHERE type = 'OUT'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
      LIMIT 6
    `, { type: sequelize_2.QueryTypes.SELECT });
            console.log(`\n${colors.cyan}Recent Consumption (by month):${colors.reset}`);
            for (const month of consumptionByMonth) {
                const monthStr = new Date(month.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                console.log(`- ${monthStr}: ${month.products} products, ${parseFloat(month.total_quantity).toFixed(2)} kg total`);
            }
            // Get recent purchases
            const recentPurchases = yield models_1.Transaction.count({
                where: {
                    type: 'IN',
                    date: {
                        [sequelize_2.Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3))
                    }
                }
            });
            console.log(`\n${colors.cyan}Recent Purchases:${colors.reset}`);
            console.log(`- Last 3 months: ${recentPurchases} transactions`);
            console.log(`\n${colors.green}✅ Testing guide complete!${colors.reset}`);
            console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
            console.log('1. Test each sheet type with small data');
            console.log('2. Once confident, run migration');
            console.log('3. Verify migrated data');
            console.log('4. Upload June 2025 data');
        }
        catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            console.error(error);
        }
        finally {
            yield sequelize_1.default.close();
        }
    });
}
if (require.main === module) {
    testAndMigrateGuide().catch(console.error);
}
