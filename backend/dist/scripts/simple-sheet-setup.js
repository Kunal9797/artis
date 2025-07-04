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
exports.setupSimpleSheets = setupSimpleSheets;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function setupSimpleSheets() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📊 Setting up your Google Sheet...\n');
        // Initialize Google Sheets API
        const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH, 'utf8'));
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        try {
            // Simple monthly upload template
            const uploadTemplate = [
                ['Artis Code', 'Consumption (kg)', 'Purchases (kg)', 'Month'],
                ['101', '', '', 'July 2025'],
                ['102', '', '', 'July 2025'],
                ['103', '', '', 'July 2025'],
                ['', '', '', ''],
                ['Instructions:', '', '', ''],
                ['1. Fill in consumption/purchases for each product', '', '', ''],
                ['2. Leave blank if no data', '', '', ''],
                ['3. Save and sync from app', '', '', ''],
            ];
            // Update Sheet1 (default sheet)
            yield sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: uploadTemplate },
            });
            console.log('✅ Created upload template in Sheet1');
            // Add corrections template in A15
            const correctionsTemplate = [
                ['', '', '', ''],
                ['CORRECTIONS TEMPLATE', '', '', ''],
                ['Artis Code', 'Month (YYYY-MM)', 'Type', 'Old Value', 'New Value', 'Reason'],
                ['Example: 101', '2024-12', 'Consumption', '100', '120', 'Data error'],
            ];
            yield sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Sheet1!A15',
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: correctionsTemplate },
            });
            console.log('✅ Added corrections template');
            // Apply some basic formatting
            const requests = [
                {
                    repeatCell: {
                        range: {
                            sheetId: 0, // Sheet1
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
                },
            ];
            yield sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests },
            });
            console.log('✅ Applied formatting');
            console.log(`\n📊 Your sheet is ready: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
        }
        catch (error) {
            console.error('❌ Error:', error.message);
        }
    });
}
if (require.main === module) {
    setupSimpleSheets().catch(console.error);
}
