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
exports.createInitialStockSheet = createInitialStockSheet;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function createInitialStockSheet() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📊 Creating Initial Stock Google Sheet...\n');
        // Initialize Google Sheets API
        const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH, 'utf8'));
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
        });
        const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
        const drive = googleapis_1.google.drive({ version: 'v3', auth });
        try {
            // Create new spreadsheet
            const createResponse = yield sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: 'Artis Initial Stock',
                    },
                    sheets: [{
                            properties: {
                                title: 'Sheet1',
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 10
                                }
                            }
                        }]
                }
            });
            const spreadsheetId = createResponse.data.spreadsheetId;
            console.log(`✅ Created spreadsheet with ID: ${spreadsheetId}`);
            // Share with service account
            yield drive.permissions.create({
                fileId: spreadsheetId,
                requestBody: {
                    type: 'user',
                    role: 'writer',
                    emailAddress: process.env.GOOGLE_SHEETS_SERVICE_EMAIL
                }
            });
            console.log(`✅ Shared with service account: ${process.env.GOOGLE_SHEETS_SERVICE_EMAIL}`);
            console.log('\n📝 Next steps:');
            console.log('1. Add this ID to your .env file:');
            console.log(`   GOOGLE_SHEETS_INITIAL_STOCK_ID=${spreadsheetId}`);
            console.log('\n2. Open the sheet to verify access:');
            console.log(`   https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
            console.log('\n3. Restart your backend server to load the new environment variable');
            console.log('\n4. Use the Google Sheets Sync page to set up the template');
        }
        catch (error) {
            console.error('❌ Error creating sheet:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
        }
    });
}
if (require.main === module) {
    createInitialStockSheet().catch(console.error);
}
