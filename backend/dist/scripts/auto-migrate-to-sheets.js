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
exports.autoMigrateToSheets = autoMigrateToSheets;
const googleapis_1 = require("googleapis");
const models_1 = require("../models");
const sequelize_1 = __importDefault(require("../config/sequelize"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const sequelize_2 = require("sequelize");
dotenv.config();
function autoMigrateToSheets() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🚀 Auto-migrating data to Google Sheets...\n');
        // Initialize Google Sheets API
        const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH, 'utf8'));
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
        try {
            yield sequelize_1.default.authenticate();
            console.log('✅ Connected to database\n');
            // Ask user what to migrate
            console.log('This will migrate your existing data to Google Sheets.');
            console.log('Make sure the sheets are empty or have only headers.\n');
            // 1. Migrate Current Stock to Initial Stock Sheet
            console.log('📊 Migrating current stock values...');
            const products = yield models_1.Product.findAll({
                attributes: ['artisCodes', 'currentStock'],
                order: [['artisCodes', 'ASC']]
            });
            const stockData = products.map(p => [
                p.artisCodes[0] || '',
                p.currentStock || 0,
                p.currentStock || 0, // Set initial stock same as current
                'Migrated from database'
            ]);
            if (stockData.length > 0) {
                yield sheets.spreadsheets.values.append({
                    spreadsheetId: process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID,
                    range: 'Sheet1!A2',
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: stockData }
                });
                console.log(`✅ Migrated ${stockData.length} product stock values`);
            }
            // 2. Migrate Last 3 Months Consumption
            console.log('\n📊 Migrating consumption data (last 3 months)...');
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const consumptionData = yield sequelize_1.default.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        DATE_TRUNC('month', t.date) as month,
        SUM(t.quantity) as total_consumption
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p.id
      WHERE t.type = 'OUT' 
        AND t.date >= :startDate
      GROUP BY p.id, p."artisCodes", DATE_TRUNC('month', t.date)
      ORDER BY month DESC, artis_code
    `, {
                replacements: { startDate: threeMonthsAgo },
                type: sequelize_2.QueryTypes.SELECT
            });
            const consumptionRows = consumptionData.map(row => [
                row.artis_code,
                parseFloat(row.total_consumption).toFixed(2),
                new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                'Migrated data'
            ]);
            if (consumptionRows.length > 0) {
                yield sheets.spreadsheets.values.append({
                    spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
                    range: 'Sheet1!A2',
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: consumptionRows }
                });
                console.log(`✅ Migrated ${consumptionRows.length} consumption records`);
            }
            // 3. Migrate Last 3 Months Purchases
            console.log('\n📊 Migrating purchase transactions (last 3 months)...');
            const purchases = yield models_1.Transaction.findAll({
                where: {
                    type: 'IN',
                    date: { [sequelize_2.Op.gte]: threeMonthsAgo }
                },
                include: [{
                        model: models_1.Product,
                        as: 'product',
                        attributes: ['artisCodes']
                    }],
                order: [['date', 'DESC']],
                limit: 100 // Limit to prevent overwhelming the sheet
            });
            const purchaseRows = purchases.map(p => {
                var _a, _b;
                const notes = p.notes || '';
                const supplierMatch = notes.match(/Supplier: ([^.]+)/);
                const supplier = supplierMatch ? supplierMatch[1] : 'Unknown';
                return [
                    ((_b = (_a = p.product) === null || _a === void 0 ? void 0 : _a.artisCodes) === null || _b === void 0 ? void 0 : _b[0]) || '',
                    p.date.toISOString().split('T')[0],
                    p.quantity.toFixed(2),
                    supplier,
                    notes
                ];
            });
            if (purchaseRows.length > 0) {
                yield sheets.spreadsheets.values.append({
                    spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID,
                    range: 'Sheet1!A2',
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: purchaseRows }
                });
                console.log(`✅ Migrated ${purchaseRows.length} purchase transactions`);
            }
            // Summary
            console.log('\n✅ Migration Complete!');
            console.log('\n📋 What was migrated:');
            console.log(`- Current stock values for all products`);
            console.log(`- Consumption data for last 3 months`);
            console.log(`- Purchase transactions for last 3 months`);
            console.log('\n⚠️  IMPORTANT: Do NOT sync these sheets back to the database!');
            console.log('This data is already in the database. The sheets are now ready for NEW data entry.');
            console.log('\n📋 Next Steps:');
            console.log('1. Review the migrated data in Google Sheets');
            console.log('2. Clear the sheets if you want to start fresh');
            console.log('3. Begin entering June 2025 data');
        }
        catch (error) {
            console.error('❌ Migration failed:', error.message);
            console.error(error);
        }
        finally {
            yield sequelize_1.default.close();
        }
    });
}
if (require.main === module) {
    autoMigrateToSheets().catch(console.error);
}
