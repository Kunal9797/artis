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
exports.testSheetsSync = testSheetsSync;
const sheets_manager_service_1 = require("../services/sheets-manager.service");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function testSheetsSync() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Testing Google Sheets Sync...\n');
        const sheetsManager = new sheets_manager_service_1.SheetsManagerService();
        try {
            // 1. Get pending counts
            console.log('📊 Checking pending data counts...');
            const pending = yield sheetsManager.getPendingSummary();
            console.log('Pending counts:', pending);
            console.log();
            // 2. Setup templates if needed
            if (pending.consumption === 0) {
                console.log('Setting up consumption template...');
                yield sheetsManager.setupConsumptionSheet();
            }
            if (pending.purchases === 0) {
                console.log('Setting up purchases template...');
                yield sheetsManager.setupPurchasesSheet();
            }
            if (pending.corrections === 0) {
                console.log('Setting up corrections template...');
                yield sheetsManager.setupCorrectionsSheet();
            }
            console.log('\n✅ All tests passed!');
            console.log('\n📌 Next steps:');
            console.log('1. Open the Google Sheets and add some test data');
            console.log('2. Run this script again to see pending counts');
            console.log('3. Use the sync API endpoints to import data');
        }
        catch (error) {
            console.error('❌ Test failed:', error.message);
            console.error(error);
        }
    });
}
if (require.main === module) {
    testSheetsSync().catch(console.error);
}
