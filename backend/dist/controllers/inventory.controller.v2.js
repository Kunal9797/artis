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
exports.bulkUploadCorrections = exports.getInventoryDetails = exports.bulkUploadPurchaseOrder = exports.getRecentTransactions = exports.clearInventory = exports.getProductTransactions = exports.createTransaction = exports.getInventory = exports.getAllInventory = exports.bulkUploadInventory = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const BulkOperation_1 = __importDefault(require("../models/BulkOperation"));
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
const sequelize_3 = require("sequelize");
const XLSX = __importStar(require("xlsx"));
// Define TransactionType enum
var TransactionType;
(function (TransactionType) {
    TransactionType["IN"] = "IN";
    TransactionType["OUT"] = "OUT";
    TransactionType["CORRECTION"] = "CORRECTION";
})(TransactionType || (TransactionType = {}));
// Simplified bulk upload for consumption data
const bulkUploadInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    console.log('=== bulkUploadInventory V2 called ===');
    if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('File received:', req.file.originalname, 'Size:', req.file.size);
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const t = yield sequelize_2.default.transaction();
    const skippedRows = [];
    const processedProducts = [];
    let totalTransactions = 0;
    try {
        // Create bulk operation record
        const operation = yield BulkOperation_1.default.create({
            type: 'consumption',
            uploadedBy: userId,
            fileName: req.file.originalname,
            status: 'processing',
            metadata: { fileSize: req.file.size }
        }, { transaction: t });
        console.log('Created BulkOperation:', operation.id);
        // Parse Excel
        console.log('Reading Excel file...');
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        console.log('Excel file parsed successfully');
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            blankrows: false
        });
        console.log('Raw data rows:', rawData.length);
        console.log('First row:', rawData[0]);
        console.log('Second row:', rawData[1]);
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
            // Use the date from second row for consumption columns
            return ((_a = secondRow[index]) === null || _a === void 0 ? void 0 : _a.toString()) || header.toString();
        });
        // Find consumption date columns
        const consumptionDates = headers
            .map((header, index) => {
            if (typeof header === 'string' && header.includes('/')) {
                const [day, month, year] = header.split('/');
                return {
                    date: new Date(parseInt('20' + year), parseInt(month) - 1, parseInt(day)),
                    column: header,
                    index
                };
            }
            return null;
        })
            .filter((date) => date !== null);
        console.log('Found consumption dates:', consumptionDates.length);
        // Process data rows
        const data = rawData.slice(2).map((row) => {
            return headers.reduce((obj, header, index) => {
                obj[header.toString()] = row[index];
                return obj;
            }, {});
        });
        console.log('Processed data rows:', data.length);
        if (data.length > 0) {
            console.log('Sample data row:', data[0]);
        }
        // Process each product
        for (const row of data) {
            const artisCode = (_b = row['OUR CODE']) === null || _b === void 0 ? void 0 : _b.toString();
            if (!artisCode) {
                skippedRows.push({
                    artisCode: 'unknown',
                    reason: 'Missing DESIGN CODE'
                });
                continue;
            }
            try {
                // Find product
                const product = yield Product_1.default.findOne({
                    where: sequelize_2.default.where(sequelize_2.default.fn('array_to_string', sequelize_2.default.col('artisCodes'), ','), { [sequelize_1.Op.like]: `%${artisCode}%` }),
                    transaction: t
                });
                if (!product) {
                    skippedRows.push({
                        artisCode,
                        reason: 'Product not found in database'
                    });
                    continue;
                }
                // Process consumption transactions only
                for (const { date, column } of consumptionDates) {
                    const consumption = parseFloat(((_c = row[column]) === null || _c === void 0 ? void 0 : _c.toString()) || '0') || 0;
                    if (consumption > 0) {
                        yield Transaction_1.default.create({
                            productId: product.id,
                            type: TransactionType.OUT,
                            quantity: consumption,
                            date,
                            notes: `Bulk upload - ${date.toLocaleDateString()}`,
                            includeInAvg: true,
                            operationId: operation.id
                        }, { transaction: t });
                        totalTransactions++;
                    }
                }
                // Process IN column if present (for initial inventory uploads)
                const initialStock = row['IN'] ? parseFloat(row['IN'].toString()) : 0;
                if (initialStock > 0) {
                    yield Transaction_1.default.create({
                        productId: product.id,
                        type: TransactionType.IN,
                        quantity: initialStock,
                        date: new Date(), // Use current date for initial stock
                        notes: 'Initial Stock',
                        includeInAvg: false,
                        operationId: operation.id
                    }, { transaction: t });
                    totalTransactions++;
                }
                processedProducts.push(artisCode);
            }
            catch (error) {
                console.error(`Error processing ${artisCode}:`, error);
                skippedRows.push({
                    artisCode,
                    reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }
        // Update operation status
        yield operation.update({
            status: skippedRows.length > 0 ? 'partial' : 'completed',
            recordsTotal: data.length,
            recordsProcessed: processedProducts.length,
            recordsFailed: skippedRows.length,
            errorLog: skippedRows.length > 0 ? JSON.stringify(skippedRows) : undefined,
            metadata: Object.assign(Object.assign({}, operation.metadata), { transactionsCreated: totalTransactions, consumptionDates: consumptionDates.map(d => d.date.toISOString()) })
        }, { transaction: t });
        yield t.commit();
        console.log('=== Upload completed ===');
        console.log(`Processed: ${processedProducts.length} products`);
        console.log(`Created: ${totalTransactions} transactions`);
        console.log(`Skipped: ${skippedRows.length} products`);
        const response = {
            success: true,
            operation: {
                id: operation.id,
                status: operation.status
            },
            summary: {
                totalRows: data.length,
                processed: processedProducts.length,
                skipped: skippedRows.length,
                transactionsCreated: totalTransactions
            },
            processed: processedProducts,
            skipped: skippedRows
        };
        console.log('Sending response...');
        res.json(response);
        console.log('Response sent');
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
// Get all inventory with calculated stock
const getAllInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Fetching all products with calculated inventory...');
        // Use raw query to get products with calculated stock
        const products = yield sequelize_2.default.query(`
      SELECT 
        p.id,
        p."artisCodes",
        p.name,
        p.supplier,
        p.category,
        p."supplierCode",
        p."minStockLevel",
        p.catalogs,
        COALESCE(
          (SELECT SUM(
            CASE 
              WHEN t.type = 'IN' THEN t.quantity
              WHEN t.type = 'OUT' THEN -t.quantity
              WHEN t.type = 'CORRECTION' THEN t.quantity
            END
          ) FROM "Transactions" t WHERE t."productId" = p.id), 
          0
        ) as "currentStock",
        COALESCE(
          (SELECT AVG(t.quantity) 
           FROM "Transactions" t 
           WHERE t."productId" = p.id 
           AND t.type = 'OUT' 
           AND t."includeInAvg" = true
           AND t.date >= CURRENT_DATE - INTERVAL '3 months'),
          0
        ) as "avgConsumption",
        (SELECT MAX(t.date) FROM "Transactions" t WHERE t."productId" = p.id) as "lastUpdated"
      FROM "Products" p
      ORDER BY p."artisCodes"[1]
    `, {
            type: sequelize_3.QueryTypes.SELECT
        });
        console.log(`Found ${products.length} products`);
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({
            error: 'Failed to fetch inventory',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getAllInventory = getAllInventory;
// Export other functions from original controller
var inventory_controller_1 = require("./inventory.controller");
Object.defineProperty(exports, "getInventory", { enumerable: true, get: function () { return inventory_controller_1.getInventory; } });
Object.defineProperty(exports, "createTransaction", { enumerable: true, get: function () { return inventory_controller_1.createTransaction; } });
Object.defineProperty(exports, "getProductTransactions", { enumerable: true, get: function () { return inventory_controller_1.getProductTransactions; } });
Object.defineProperty(exports, "clearInventory", { enumerable: true, get: function () { return inventory_controller_1.clearInventory; } });
Object.defineProperty(exports, "getRecentTransactions", { enumerable: true, get: function () { return inventory_controller_1.getRecentTransactions; } });
Object.defineProperty(exports, "bulkUploadPurchaseOrder", { enumerable: true, get: function () { return inventory_controller_1.bulkUploadPurchaseOrder; } });
Object.defineProperty(exports, "getInventoryDetails", { enumerable: true, get: function () { return inventory_controller_1.getInventoryDetails; } });
Object.defineProperty(exports, "bulkUploadCorrections", { enumerable: true, get: function () { return inventory_controller_1.bulkUploadCorrections; } });
