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
exports.syncFromGoogleSheets = syncFromGoogleSheets;
const google_sheets_service_1 = require("../services/google-sheets.service");
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const models_1 = require("../models");
const sequelize_1 = __importDefault(require("../config/sequelize"));
dotenv.config();
function setupMonthlySheets() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📊 Setting up monthly upload sheets...\n');
        // Initialize Google Sheets
        const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH, 'utf8'));
        const sheetsService = new google_sheets_service_1.GoogleSheetsService({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            credentials
        });
        try {
            // Connect to database to get product list
            yield sequelize_1.default.authenticate();
            console.log('✅ Connected to database');
            // Get current month
            const currentDate = new Date();
            const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            // 1. Create Monthly Upload Template
            console.log(`📝 Creating template for ${monthName}...`);
            // Get all products
            const products = yield models_1.Product.findAll({
                order: [['artisCodes', 'ASC']],
                attributes: ['artisCodes']
            });
            // Create template data
            const templateData = [
                ['Artis Code', 'Consumption (kg)', 'Purchases (kg)', 'Notes'],
                ...products.map(p => [
                    p.artisCodes[0] || '',
                    '', // Empty for user to fill
                    '', // Empty for user to fill
                    monthName
                ])
            ];
            yield sheetsService.updateInventoryData(templateData, `Upload - ${monthName}`);
            console.log(`✅ Created monthly upload template`);
            // 2. Create Corrections Template
            console.log('\n📝 Creating corrections template...');
            const correctionsData = [
                ['Artis Code', 'Month (YYYY-MM)', 'Type', 'Old Value', 'New Value', 'Reason'],
                // Example rows
                ['Example: 101', '2024-12', 'Consumption', '100', '120', 'Data entry error'],
                ['Example: 102', '2024-11', 'Purchase', '500', '450', 'Wrong quantity'],
            ];
            yield sheetsService.updateInventoryData(correctionsData, 'Corrections');
            console.log('✅ Created corrections template');
            // 3. Create Quick Entry sheet for daily updates
            console.log('\n📝 Creating quick entry sheet...');
            const quickEntryData = [
                ['Date', 'Artis Code', 'Type', 'Quantity (kg)', 'Notes'],
                [currentDate.toISOString().split('T')[0], '', 'Consumption', '', ''],
                ['', '', 'Purchase', '', ''],
            ];
            yield sheetsService.updateInventoryData(quickEntryData, 'Quick Entry');
            console.log('✅ Created quick entry sheet');
            // 4. Create Instructions sheet
            console.log('\n📝 Adding instructions...');
            const instructionsData = [
                ['How to Use This Sheet'],
                [''],
                ['1. MONTHLY UPLOAD:'],
                ['   - Go to "Upload - [Month]" tab'],
                ['   - Fill in Consumption and/or Purchases columns'],
                ['   - Click "Sync to Database" in your app'],
                [''],
                ['2. CORRECTIONS:'],
                ['   - Go to "Corrections" tab'],
                ['   - Enter the Artis Code, Month, and correction details'],
                ['   - Old Value = what\'s currently in the system'],
                ['   - New Value = what it should be'],
                [''],
                ['3. QUICK ENTRY:'],
                ['   - For daily entries during the month'],
                ['   - Gets consolidated at month end'],
                [''],
                ['TIPS:'],
                ['- Leave cells empty if no data (don\'t put 0)'],
                ['- Dates should be in YYYY-MM-DD format'],
                ['- All quantities in kilograms'],
            ];
            yield sheetsService.updateInventoryData(instructionsData, 'Instructions');
            console.log('✅ Added instructions');
            console.log('\n🎉 Setup complete!');
            console.log(`📊 Open your sheet: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEETS_ID}/edit`);
            console.log('\n📌 Next steps:');
            console.log('1. Fill in the monthly data');
            console.log('2. Run sync from your app to import to Supabase');
        }
        catch (error) {
            console.error('❌ Error:', error);
        }
        finally {
            yield sequelize_1.default.close();
        }
    });
}
// Add sync function to pull data from sheets
function syncFromGoogleSheets() {
    return __awaiter(this, void 0, void 0, function* () {
        const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH, 'utf8'));
        const sheetsService = new google_sheets_service_1.GoogleSheetsService({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID,
            credentials
        });
        // Get current month sheet
        const currentDate = new Date();
        const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const data = yield sheetsService.getInventorySnapshot();
        // Process and import to Supabase
        console.log(`Found ${data.length} rows to process`);
        // Implementation depends on your specific needs
        return data;
    });
}
if (require.main === module) {
    setupMonthlySheets().catch(console.error);
}
