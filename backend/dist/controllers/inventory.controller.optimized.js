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
exports.bulkUploadInventory = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const BulkOperation_1 = __importDefault(require("../models/BulkOperation"));
const sequelize_1 = __importDefault(require("../config/sequelize"));
const XLSX = __importStar(require("xlsx"));
const batchUpdateStock_1 = require("../utils/batchUpdateStock");
// Define TransactionType enum
var TransactionType;
(function (TransactionType) {
    TransactionType["IN"] = "IN";
    TransactionType["OUT"] = "OUT";
    TransactionType["CORRECTION"] = "CORRECTION";
})(TransactionType || (TransactionType = {}));
// Optimized bulk upload that processes in batches
const bulkUploadInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    console.log('=== Optimized bulkUploadInventory called ===');
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('File received:', req.file.originalname, 'Size:', req.file.size);
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const t = yield sequelize_1.default.transaction();
    const skippedRows = [];
    const processedProducts = [];
    try {
        // Create bulk operation record
        const operation = yield BulkOperation_1.default.create({
            type: 'consumption',
            uploadedBy: userId,
            fileName: req.file.originalname,
            status: 'processing',
            metadata: { fileSize: req.file.size }
        }, { transaction: t });
        // Parse Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
        console.log('Raw data rows:', rawData.length);
        const [firstRow, secondRow] = rawData;
        // Map columns
        const columnMap = {
            'DESIGN CODE': 'OUR CODE',
            'OPEN': 'IN'
        };
        // Create header mapping
        const headers = firstRow.map((header, index) => {
            var _a;
            if (header === 'SNO')
                return 'SNO';
            if (typeof header === 'string' && columnMap[header]) {
                return columnMap[header];
            }
            return ((_a = secondRow[index]) === null || _a === void 0 ? void 0 : _a.toString()) || header.toString();
        });
        // Find consumption date columns
        const consumptionDates = headers
            .map((header, index) => {
            if (typeof header === 'string' && header.includes('/')) {
                const [day, month, year] = header.split('/');
                const parsedDate = new Date(parseInt('20' + year), parseInt(month) - 1, parseInt(day));
                console.log(`Parsing date header "${header}": day=${day}, month=${month}, year=${year} => ${parsedDate.toISOString()}`);
                return {
                    date: parsedDate,
                    column: header,
                    index
                };
            }
            return null;
        })
            .filter((date) => date !== null);
        // Process data rows
        const data = rawData.slice(2).map((row) => {
            return headers.reduce((obj, header, index) => {
                obj[header.toString()] = row[index];
                return obj;
            }, {});
        });
        console.log('Processed data rows:', data.length);
        console.log('Consumption dates found:', consumptionDates.length);
        console.log('Headers:', headers);
        console.log('First data row:', data[0]);
        // Get all products at once for faster lookup
        const allProducts = yield Product_1.default.findAll({
            attributes: ['id', 'artisCodes', 'currentStock'],
            transaction: t
        });
        // Create a map for faster product lookup
        const productMap = new Map();
        allProducts.forEach(product => {
            product.artisCodes.forEach(code => {
                productMap.set(code.toString(), product);
            });
        });
        // Prepare bulk transactions
        const transactionsToCreate = [];
        let processedCount = 0;
        // Process each row
        for (const row of data) {
            const artisCode = (_b = row['OUR CODE']) === null || _b === void 0 ? void 0 : _b.toString();
            if (!artisCode) {
                skippedRows.push({ artisCode: 'unknown', reason: 'Missing DESIGN CODE' });
                continue;
            }
            const product = productMap.get(artisCode);
            if (!product) {
                skippedRows.push({ artisCode, reason: 'Product not found' });
                continue;
            }
            // Add consumption transactions
            for (const { date, column } of consumptionDates) {
                const consumption = parseFloat(((_c = row[column]) === null || _c === void 0 ? void 0 : _c.toString()) || '0') || 0;
                if (consumption > 0) {
                    transactionsToCreate.push({
                        productId: product.id,
                        type: TransactionType.OUT,
                        quantity: consumption,
                        date,
                        notes: `Bulk upload - ${date.toLocaleDateString()}`,
                        includeInAvg: true,
                        operationId: operation.id
                    });
                }
            }
            // Add initial stock if present
            const initialStock = row['IN'] ? parseFloat(row['IN'].toString()) : 0;
            if (initialStock > 0) {
                // Use September 1, 2024 as the initial stock date
                // This ensures initial stock is before all consumption dates
                const initialStockDate = new Date(2024, 8, 1); // September 1, 2024
                transactionsToCreate.push({
                    productId: product.id,
                    type: TransactionType.IN,
                    quantity: initialStock,
                    date: initialStockDate,
                    notes: 'Initial Stock',
                    includeInAvg: false,
                    operationId: operation.id
                });
            }
            processedProducts.push(artisCode);
            processedCount++;
            // Log progress every 25 products
            if (processedCount % 25 === 0) {
                console.log(`Processed ${processedCount}/${data.length} products...`);
            }
        }
        console.log('Creating transactions in bulk...');
        // Create all transactions in batches
        const batchSize = 100;
        for (let i = 0; i < transactionsToCreate.length; i += batchSize) {
            const batch = transactionsToCreate.slice(i, i + batchSize);
            yield Transaction_1.default.bulkCreate(batch, { transaction: t });
            console.log(`Created ${Math.min(i + batchSize, transactionsToCreate.length)}/${transactionsToCreate.length} transactions`);
        }
        // Update operation status
        yield operation.update({
            status: skippedRows.length > 0 ? 'partial' : 'completed',
            recordsTotal: data.length,
            recordsProcessed: processedProducts.length,
            recordsFailed: skippedRows.length,
            metadata: Object.assign(Object.assign({}, operation.metadata), { transactionsCreated: transactionsToCreate.length })
        }, { transaction: t });
        // Update product stock and consumption values using batch update
        console.log('Updating product stock values...');
        const uniqueProductIds = [...new Set(transactionsToCreate.map(t => t.productId))];
        // Use batch update for much better performance
        yield (0, batchUpdateStock_1.batchUpdateProductStock)(uniqueProductIds, t);
        yield t.commit();
        console.log('=== Upload completed ===');
        console.log(`Processed: ${processedProducts.length} products`);
        console.log(`Created: ${transactionsToCreate.length} transactions`);
        console.log(`Updated stock for: ${uniqueProductIds.length} products`);
        console.log(`Skipped: ${skippedRows.length} products`);
        // Send response
        res.json({
            success: true,
            operation: {
                id: operation.id,
                status: operation.status
            },
            summary: {
                totalRows: data.length,
                processed: processedProducts.length,
                skipped: skippedRows.length,
                transactionsCreated: transactionsToCreate.length
            },
            processed: processedProducts,
            skipped: skippedRows
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('=== Upload error ===', error);
        res.status(500).json({
            error: 'Failed to process inventory upload',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkUploadInventory = bulkUploadInventory;
exports.default = exports.bulkUploadInventory;
