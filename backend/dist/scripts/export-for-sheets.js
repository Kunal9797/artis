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
exports.exportForSheets = exportForSheets;
const models_1 = require("../models");
const sequelize_1 = __importDefault(require("../config/sequelize"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sequelize_2 = require("sequelize");
function exportForSheets() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📊 Exporting data for Google Sheets...\n');
        try {
            yield sequelize_1.default.authenticate();
            // Create export directory
            const exportDir = path.join(process.cwd(), 'exports');
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir);
            }
            // 1. Export Monthly Consumption Summary
            console.log('📝 Exporting consumption summary...');
            const consumptionData = yield sequelize_1.default.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        DATE_TRUNC('month', t.date) as month,
        SUM(t.quantity) as total_consumption
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p.id
      WHERE t.type = 'OUT'
      GROUP BY p.id, p."artisCodes", DATE_TRUNC('month', t.date)
      ORDER BY month DESC, artis_code
    `, { type: sequelize_2.QueryTypes.SELECT });
            // Group by month for consumption sheet format
            const consumptionByMonth = {};
            for (const row of consumptionData) {
                const monthStr = new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                if (!consumptionByMonth[monthStr]) {
                    consumptionByMonth[monthStr] = [];
                }
                consumptionByMonth[monthStr].push({
                    artisCode: row.artis_code,
                    consumption: parseFloat(row.total_consumption).toFixed(2)
                });
            }
            // Write consumption files
            for (const [month, data] of Object.entries(consumptionByMonth)) {
                const filename = `consumption_${month.replace(' ', '_')}.csv`;
                const csvContent = 'Artis Code,Consumption (kg),Month,Notes\n' +
                    data.map(d => `${d.artisCode},${d.consumption},${month},Migrated data`).join('\n');
                fs.writeFileSync(path.join(exportDir, filename), csvContent);
                console.log(`✅ Created ${filename}`);
            }
            // 2. Export All Purchases
            console.log('\n📝 Exporting purchases...');
            const purchases = yield models_1.Transaction.findAll({
                where: { type: 'IN' },
                include: [{
                        model: models_1.Product,
                        as: 'product',
                        attributes: ['artisCodes']
                    }],
                order: [['date', 'DESC']]
            });
            const purchasesCsv = 'Artis Code,Date,Amount (kg),Supplier,Notes\n' +
                purchases.map(p => {
                    var _a, _b;
                    const artisCode = ((_b = (_a = p.product) === null || _a === void 0 ? void 0 : _a.artisCodes) === null || _b === void 0 ? void 0 : _b[0]) || '';
                    const date = p.date.toISOString().split('T')[0];
                    const amount = p.quantity.toFixed(2);
                    const notes = p.notes || 'Migrated data';
                    // Extract supplier from notes if available
                    const supplierMatch = notes.match(/Supplier: ([^.]+)/);
                    const supplier = supplierMatch ? supplierMatch[1] : 'Unknown';
                    return `${artisCode},${date},${amount},${supplier},"${notes}"`;
                }).join('\n');
            fs.writeFileSync(path.join(exportDir, 'all_purchases.csv'), purchasesCsv);
            console.log('✅ Created all_purchases.csv');
            // 3. Export Current Stock Summary
            console.log('\n📝 Exporting current stock...');
            const products = yield models_1.Product.findAll({
                attributes: ['artisCodes', 'currentStock'],
                order: [['artisCodes', 'ASC']]
            });
            const stockCsv = 'Artis Code,Current Stock (kg),Initial Stock (kg),Notes\n' +
                products.map(p => {
                    const artisCode = p.artisCodes[0] || '';
                    const currentStock = p.currentStock || 0;
                    return `${artisCode},${currentStock},,Set initial stock if needed`;
                }).join('\n');
            fs.writeFileSync(path.join(exportDir, 'current_stock.csv'), stockCsv);
            console.log('✅ Created current_stock.csv');
            // 4. Summary Report
            console.log('\n📊 Export Summary:');
            console.log(`- Total products: ${products.length}`);
            console.log(`- Total purchases: ${purchases.length}`);
            console.log(`- Consumption months: ${Object.keys(consumptionByMonth).length}`);
            console.log(`\n📁 Files saved to: ${exportDir}`);
            console.log('\n📋 Next Steps:');
            console.log('1. Open each CSV file');
            console.log('2. Copy the data (without headers)');
            console.log('3. Paste into the corresponding Google Sheet');
            console.log('4. Sync from the app to import into database');
        }
        catch (error) {
            console.error('❌ Export failed:', error);
        }
        finally {
            yield sequelize_1.default.close();
        }
    });
}
if (require.main === module) {
    exportForSheets().catch(console.error);
}
