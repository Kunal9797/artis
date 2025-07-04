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
exports.getProductStock = exports.bulkUploadInventorySimplified = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const BulkOperation_1 = __importDefault(require("../models/BulkOperation"));
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
const sequelize_3 = require("sequelize");
const XLSX = __importStar(require("xlsx"));
// Simplified bulk upload that only creates transactions
const bulkUploadInventorySimplified = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log('=== Simplified Bulk Upload Started ===');
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const t = yield sequelize_2.default.transaction();
    try {
        // Create bulk operation record
        const operation = yield BulkOperation_1.default.create({
            type: 'consumption',
            uploadedBy: userId,
            fileName: req.file.originalname,
            status: 'processing',
            metadata: { fileSize: req.file.size }
        }, { transaction: t });
        console.log('Created operation:', operation.id);
        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
        console.log('Excel parsed, rows:', rawData.length);
        // Process headers
        const [headerRow, dateRow] = rawData;
        const dataRows = rawData.slice(2);
        // Find consumption columns (those with dates)
        const consumptionColumns = [];
        headerRow.forEach((header, index) => {
            const dateStr = dateRow[index];
            if (dateStr && typeof dateStr === 'string' && dateStr.includes('/')) {
                // Parse date format DD/MM/YY
                const [day, month, year] = dateStr.split('/');
                const fullYear = parseInt('20' + year);
                const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
                consumptionColumns.push({ index, date });
            }
        });
        console.log('Found consumption columns:', consumptionColumns.length);
        // Track processing
        const processed = [];
        const skipped = [];
        let totalTransactions = 0;
        // Process each product row
        for (const row of dataRows) {
            const artisCode = (_b = row[1]) === null || _b === void 0 ? void 0 : _b.toString(); // Assuming DESIGN CODE is column 1
            if (!artisCode) {
                skipped.push({ artisCode: 'unknown', reason: 'Missing design code' });
                continue;
            }
            // Find product by artis code
            const product = yield Product_1.default.findOne({
                where: sequelize_2.default.where(sequelize_2.default.fn('array_to_string', sequelize_2.default.col('artisCodes'), ','), { [sequelize_1.Op.like]: `%${artisCode}%` }),
                transaction: t
            });
            if (!product) {
                skipped.push({ artisCode, reason: 'Product not found' });
                continue;
            }
            // Create consumption transactions
            for (const { index, date } of consumptionColumns) {
                const quantity = parseFloat(row[index]) || 0;
                if (quantity > 0) {
                    yield Transaction_1.default.create({
                        productId: product.id,
                        type: 'OUT',
                        quantity,
                        date,
                        notes: `Bulk upload - ${date.toLocaleDateString()}`,
                        includeInAvg: true,
                        operationId: operation.id
                    }, { transaction: t });
                    totalTransactions++;
                }
            }
            processed.push(artisCode);
        }
        // Update operation status
        yield operation.update({
            status: skipped.length > 0 ? 'partial' : 'completed',
            recordsTotal: dataRows.length,
            recordsProcessed: processed.length,
            recordsFailed: skipped.length,
            errorLog: skipped.length > 0 ? JSON.stringify(skipped) : undefined
        }, { transaction: t });
        yield t.commit();
        console.log('=== Upload Completed ===');
        console.log(`Processed: ${processed.length} products`);
        console.log(`Created: ${totalTransactions} transactions`);
        console.log(`Skipped: ${skipped.length} products`);
        // Send response
        res.json({
            success: true,
            operation: {
                id: operation.id,
                status: operation.status
            },
            summary: {
                totalProducts: dataRows.length,
                processed: processed.length,
                skipped: skipped.length,
                transactionsCreated: totalTransactions
            },
            processed,
            skipped
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Failed to process upload',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkUploadInventorySimplified = bulkUploadInventorySimplified;
// Get current stock by calculating from transactions
const getProductStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { productId } = req.params;
        const result = yield sequelize_2.default.query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN type = 'IN' THEN quantity
            WHEN type = 'OUT' THEN -quantity
            WHEN type = 'CORRECTION' THEN quantity
          END
        ), 0) as current_stock
      FROM "Transactions"
      WHERE "productId" = :productId
    `, {
            replacements: { productId },
            type: sequelize_3.QueryTypes.SELECT
        });
        const currentStock = ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.current_stock) || 0;
        res.json({ productId, currentStock });
    }
    catch (error) {
        console.error('Error calculating stock:', error);
        res.status(500).json({ error: 'Failed to calculate stock' });
    }
});
exports.getProductStock = getProductStock;
