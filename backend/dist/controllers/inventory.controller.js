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
exports.bulkUploadCorrections = exports.getInventoryDetails = exports.bulkUploadPurchaseOrder = exports.getRecentTransactions = exports.clearInventory = exports.getInventory = exports.bulkUploadInventory = exports.getProductTransactions = exports.createTransaction = exports.getAllInventory = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
const XLSX = __importStar(require("xlsx"));
const product_controller_1 = require("./product.controller");
// Define TransactionType enum since we removed InventoryTransaction model
var TransactionType;
(function (TransactionType) {
    TransactionType["IN"] = "IN";
    TransactionType["OUT"] = "OUT";
    TransactionType["CORRECTION"] = "CORRECTION";
})(TransactionType || (TransactionType = {}));
// Get all inventory items with their associated products
const getAllInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Fetching all products with inventory...');
        const products = yield Product_1.default.findAll({
            attributes: [
                'id', 'artisCodes', 'name', 'supplier', 'category', 'supplierCode',
                'currentStock', 'lastUpdated', 'minStockLevel', 'avgConsumption', 'catalogs'
            ],
            include: [{
                    model: Transaction_1.default,
                    as: 'transactions',
                    attributes: ['id', 'type', 'quantity', 'date', 'notes'],
                    required: false,
                    order: [['date', 'DESC']]
                }],
            order: [['artisCodes', 'ASC']]
        });
        console.log(`Found ${products.length} products`);
        if (products.length > 0) {
            // Find a product with transactions to log as sample
            const sampleProduct = products.find(p => p.transactions && p.transactions.length > 0);
            if (sampleProduct) {
                console.log('Sample product with transactions:', {
                    artisCodes: sampleProduct.artisCodes,
                    currentStock: sampleProduct.currentStock,
                    avgConsumption: sampleProduct.avgConsumption,
                    transactionCount: sampleProduct.transactions.length
                });
            }
        }
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching inventory:', error);
        console.error('Detailed error:', JSON.stringify(error, null, 2));
        res.status(500).json({
            error: 'Error fetching inventory',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getAllInventory = getAllInventory;
// Record a new inventory transaction and update current stock
const createTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_2.default.transaction();
    try {
        const { productId, type, quantity, notes, date, includeInAvg } = req.body;
        const product = yield Product_1.default.findByPk(productId, {
            transaction: t,
            lock: true
        });
        if (!product) {
            throw new Error('Product not found');
        }
        // Calculate new stock based on transaction type
        let stockChange = 0;
        if (type === TransactionType.IN) {
            stockChange = Number(quantity);
        }
        else if (type === TransactionType.OUT) {
            stockChange = -Number(quantity);
        }
        else if (type === TransactionType.CORRECTION) {
            // For corrections, the quantity represents the direct adjustment amount
            // Positive values increase stock, negative values decrease stock
            stockChange = Number(quantity);
        }
        const newStock = Number(product.currentStock) + stockChange;
        // Create transaction
        const transaction = yield Transaction_1.default.create({
            productId,
            type,
            quantity: Number(quantity),
            notes,
            date: date || new Date(),
            // CORRECTION transactions should never affect consumption averages
            includeInAvg: type === TransactionType.OUT ? (includeInAvg || false) : false
        }, { transaction: t });
        // Update product stock
        yield product.update({
            currentStock: Number(newStock.toFixed(2)),
            lastUpdated: new Date()
        }, { transaction: t });
        // Update average consumption if it's an OUT transaction with includeInAvg
        if (type === TransactionType.OUT && includeInAvg) {
            yield (0, product_controller_1.updateProductAverageConsumption)(product.id, t);
        }
        yield t.commit();
        res.status(201).json(transaction);
    }
    catch (error) {
        yield t.rollback();
        console.error('Transaction error:', error);
        res.status(400).json({
            error: 'Error creating transaction',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.createTransaction = createTransaction;
// Get transaction history and current stock for a product
const getProductTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const product = yield Product_1.default.findByPk(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        const transactions = yield Transaction_1.default.findAll({
            where: { productId },
            include: [{
                    model: Product_1.default,
                    attributes: ['artisCodes', 'name', 'supplierCode', 'supplier', 'category']
                }],
            order: [['date', 'ASC']]
        });
        let currentStock = 0;
        const transactionsWithBalance = transactions.map(t => {
            const quantity = Number(t.quantity);
            if (t.type === TransactionType.IN) {
                currentStock += quantity;
            }
            else if (t.type === TransactionType.OUT) {
                currentStock -= quantity;
            }
            else if (t.type === TransactionType.CORRECTION) {
                // For CORRECTION, we directly add the quantity (which can be positive or negative)
                currentStock += quantity;
            }
            return Object.assign(Object.assign({}, t.toJSON()), { balance: Number(currentStock.toFixed(2)) });
        });
        res.json({
            currentStock: Number(currentStock.toFixed(2)),
            transactions: transactionsWithBalance.reverse()
        });
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            error: 'Failed to fetch transactions',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getProductTransactions = getProductTransactions;
const bulkUploadInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('=== bulkUploadInventory called ===');
    if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('File received:', req.file.originalname, 'Size:', req.file.size);
    const t = yield sequelize_2.default.transaction();
    const skippedRows = [];
    const processedProducts = [];
    try {
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
        // Map your Excel columns to the expected format
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
        // Convert dates to consumption date format
        const consumptionDates = headers
            .map((header, index) => {
            if (typeof header === 'string') {
                // Check if it's an Excel serial number
                if (!isNaN(Number(header)) && !header.includes('/')) {
                    const excelSerialNumber = parseInt(header);
                    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
                    const parsedDate = new Date(excelEpoch.getTime() + excelSerialNumber * 24 * 60 * 60 * 1000);
                    if (!isNaN(parsedDate.getTime())) {
                        console.log(`Header Excel serial ${excelSerialNumber} converted to: ${parsedDate.toISOString().split('T')[0]}`);
                        return {
                            date: parsedDate,
                            column: header,
                            index
                        };
                    }
                }
                else if (header.includes('/')) {
                    // Parse as DD/MM/YY format
                    const [day, month, year] = header.split('/');
                    return {
                        date: new Date(parseInt('20' + year), parseInt(month) - 1, parseInt(day)),
                        column: header,
                        index
                    };
                }
            }
            return null;
        })
            .filter((date) => date !== null)
            .filter(({ column }) => !column.includes('09/01/24')); // Exclude initial stock date
        // Process data rows
        const data = rawData.slice(2).map((row) => {
            return headers.reduce((obj, header, index) => {
                obj[header.toString()] = row[index];
                return obj;
            }, {});
        });
        console.log('Processed data rows:', data.length);
        console.log('Sample data row:', data[0]);
        // Process each row
        yield Promise.all(data.map((row) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const artisCode = (_a = row['OUR CODE']) === null || _a === void 0 ? void 0 : _a.toString();
            const initialStock = row['IN'] ? parseFloat(row['IN']) : 0;
            if (!artisCode) {
                skippedRows.push({
                    artisCode: 'unknown',
                    reason: 'Missing DESIGN CODE'
                });
                return;
            }
            try {
                const product = yield Product_1.default.findOne({
                    where: {
                        artisCodes: {
                            [sequelize_1.Op.contains]: [artisCode]
                        }
                    },
                    transaction: t,
                    lock: true
                });
                if (!product) {
                    skippedRows.push({
                        artisCode,
                        reason: 'Product not found'
                    });
                    return;
                }
                const isInitialInventory = headers.some(h => h === 'IN' || h === 'OPEN');
                // For consumption-only uploads, use current stock from database
                // currentStock is DECIMAL type which Sequelize returns as string
                let newStock = typeof product.currentStock === 'string'
                    ? parseFloat(product.currentStock)
                    : Number(product.currentStock) || 0;
                if (isInitialInventory && initialStock > 0) {
                    // Only process initial stock if this is an inventory upload with IN column
                    yield product.update({
                        currentStock: 0,
                        lastUpdated: new Date()
                    }, { transaction: t });
                    yield Transaction_1.default.create({
                        productId: product.id,
                        type: TransactionType.IN,
                        quantity: initialStock,
                        date: new Date('2024-01-09'),
                        notes: 'Initial Stock',
                        includeInAvg: false
                    }, { transaction: t });
                    newStock = initialStock;
                }
                // Record consumption transactions (OUT)
                for (const { date, column } of consumptionDates) {
                    const consumption = parseFloat(row[column]) || 0;
                    yield Transaction_1.default.create({
                        productId: product.id,
                        type: TransactionType.OUT,
                        quantity: consumption,
                        date,
                        notes: `Monthly Consumption - ${date.toLocaleDateString()}`,
                        includeInAvg: true
                    }, { transaction: t });
                }
                // Calculate total consumption for current stock
                const totalConsumption = consumptionDates.reduce((sum, { column }) => {
                    const consumption = parseFloat(row[column]) || 0;
                    console.log(`Consumption for ${column}: ${consumption}`);
                    return sum + consumption;
                }, 0);
                newStock = Number((newStock - totalConsumption).toFixed(2));
                console.log(`Product ${artisCode}: Initial stock: ${initialStock}, Total consumption: ${totalConsumption}, Final stock: ${newStock}`);
                // Update product's current stock
                yield product.update({
                    currentStock: newStock,
                    lastUpdated: new Date()
                }, { transaction: t });
                // Always update average consumption for bulk imports
                yield (0, product_controller_1.updateProductAverageConsumption)(product.id, t);
                processedProducts.push(artisCode);
            }
            catch (error) {
                console.error(`Error processing ${artisCode}:`, error);
                skippedRows.push({
                    artisCode,
                    reason: `Error processing: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        })));
        yield t.commit();
        console.log('=== Upload completed ===');
        console.log(`Processed: ${processedProducts.length} products`);
        console.log(`Skipped: ${skippedRows.length} products`);
        const response = {
            success: true,
            processed: processedProducts,
            skipped: skippedRows
        };
        console.log('Sending response:', JSON.stringify(response).substring(0, 100) + '...');
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
const getInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const product = yield Product_1.default.findByPk(productId, {
            attributes: ['id', 'artisCodes', 'name', 'currentStock', 'lastUpdated', 'minStockLevel']
        });
        res.json(product);
    }
    catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Error fetching inventory' });
    }
});
exports.getInventory = getInventory;
const clearInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_2.default.transaction();
    try {
        // Delete all transactions
        yield Transaction_1.default.destroy({
            where: {},
            transaction: t
        });
        // Reset all products' current stock and avgConsumption to 0
        yield Product_1.default.update({
            currentStock: 0,
            avgConsumption: 0,
            lastUpdated: new Date()
        }, {
            where: {},
            transaction: t
        });
        yield t.commit();
        res.json({ message: 'All inventory data cleared successfully' });
    }
    catch (error) {
        yield t.rollback();
        console.error('Error clearing inventory:', error);
        res.status(500).json({
            error: 'Failed to clear inventory',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.clearInventory = clearInventory;
const getRecentTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = yield Transaction_1.default.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{
                    model: Product_1.default,
                    attributes: ['artisCodes', 'name']
                }]
        });
        res.json(transactions);
    }
    catch (error) {
        console.error('Error fetching recent transactions:', error);
        res.status(500).json({ error: 'Error fetching recent transactions' });
    }
});
exports.getRecentTransactions = getRecentTransactions;
// Get inventory details for a specific product
const bulkUploadPurchaseOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const t = yield sequelize_2.default.transaction();
    const skippedRows = [];
    const processedOrders = [];
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);
        for (const row of data) {
            const artisCode = (_a = row['Artis Code']) === null || _a === void 0 ? void 0 : _a.toString();
            const rawDate = (_b = row['Date']) === null || _b === void 0 ? void 0 : _b.toString();
            const amount = parseFloat(row['Amount (Kgs)'].toString());
            const notes = ((_c = row['Notes']) === null || _c === void 0 ? void 0 : _c.toString()) || '';
            if (!artisCode || !rawDate || isNaN(amount)) {
                skippedRows.push({
                    artisCode: artisCode || 'unknown',
                    reason: 'Missing or invalid fields'
                });
                continue;
            }
            // Parse date
            const [month, day, year] = rawDate.split('/');
            const fullYear = parseInt('20' + year);
            const parsedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
            if (isNaN(parsedDate.getTime())) {
                skippedRows.push({
                    artisCode: artisCode || 'unknown',
                    reason: 'Invalid date'
                });
                continue;
            }
            const product = yield Product_1.default.findOne({
                where: {
                    artisCodes: {
                        [sequelize_1.Op.contains]: [artisCode]
                    }
                },
                transaction: t,
                lock: true
            });
            if (!product) {
                skippedRows.push({
                    artisCode,
                    reason: 'Product not found'
                });
                continue;
            }
            try {
                // Create transaction
                yield Transaction_1.default.create({
                    productId: product.id,
                    type: TransactionType.IN,
                    quantity: amount,
                    date: parsedDate,
                    notes
                }, { transaction: t });
                // Update product stock and lastUpdated
                yield product.update({
                    currentStock: Number((Number(product.currentStock) + amount).toFixed(2)),
                    lastUpdated: new Date()
                }, { transaction: t });
                // Recalculate average consumption
                yield (0, product_controller_1.updateProductAverageConsumption)(product.id, t);
                processedOrders.push(artisCode);
            }
            catch (error) {
                skippedRows.push({
                    artisCode,
                    reason: `Error processing: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }
        yield t.commit();
        res.json({
            message: 'Purchase orders processed successfully',
            processed: processedOrders,
            skipped: skippedRows
        });
    }
    catch (error) {
        yield t.rollback();
        res.status(500).json({
            error: 'Failed to process purchase order upload',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkUploadPurchaseOrder = bulkUploadPurchaseOrder;
const getInventoryDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const product = yield Product_1.default.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const transactions = yield Transaction_1.default.findAll({
            where: { productId: id },
            order: [['date', 'DESC']],
            include: [{
                    model: Product_1.default,
                    attributes: ['artisCodes', 'name', 'supplierCode', 'supplier']
                }]
        });
        // Calculate running balance for each transaction
        let balance = product.currentStock;
        const transactionsWithBalance = transactions.map(t => {
            const transaction = t.toJSON();
            // Adjust balance based on transaction type
            if (t.type === 'OUT') {
                balance = balance + t.quantity; // Adding back what was consumed
            }
            else if (t.type === 'IN') {
                balance = balance - t.quantity; // Removing what was added
            }
            else if (t.type === 'CORRECTION') {
                balance = balance - t.quantity; // Removing the correction amount
            }
            return Object.assign(Object.assign({}, transaction), { balance: Number(balance.toFixed(2)) });
        }).reverse(); // Reverse to show oldest first
        res.json({
            product: {
                id: product.id,
                artisCodes: product.artisCodes,
                name: product.name,
                supplierCode: product.supplierCode,
                supplier: product.supplier,
                currentStock: product.currentStock,
                lastUpdated: product.lastUpdated
            },
            transactions: transactionsWithBalance
        });
    }
    catch (error) {
        console.error('Error fetching inventory details:', error);
        res.status(500).json({ error: 'Failed to fetch inventory details' });
    }
});
exports.getInventoryDetails = getInventoryDetails;
// Implementation of bulk corrections upload
const bulkUploadCorrections = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const t = yield sequelize_2.default.transaction();
    const skippedRows = [];
    const processedCorrections = [];
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);
        // Validate and process each row
        for (const row of data) {
            // Skip any row that has "Instructions" or empty cells (likely header or instructions)
            if (((_a = row['Artis Code']) === null || _a === void 0 ? void 0 : _a.toString().includes('Instructions')) ||
                !row['Artis Code'] ||
                !row['Date (MM/DD/YY)'] ||
                row['Correction Amount'] === undefined) {
                continue;
            }
            const artisCode = (_b = row['Artis Code']) === null || _b === void 0 ? void 0 : _b.toString();
            const rawDate = (_c = row['Date (MM/DD/YY)']) === null || _c === void 0 ? void 0 : _c.toString();
            const correctionAmount = parseFloat(row['Correction Amount'].toString());
            const reason = ((_d = row['Reason']) === null || _d === void 0 ? void 0 : _d.toString()) || 'Bulk correction';
            // Validate required fields
            if (!artisCode || !rawDate || isNaN(correctionAmount)) {
                skippedRows.push({
                    artisCode: artisCode || 'unknown',
                    reason: 'Missing or invalid fields'
                });
                continue;
            }
            // Parse the date (MM/DD/YY format)
            let parsedDate;
            try {
                const [month, day, year] = rawDate.split('/');
                const fullYear = parseInt('20' + year);
                parsedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
                if (isNaN(parsedDate.getTime())) {
                    throw new Error('Invalid date format');
                }
            }
            catch (error) {
                skippedRows.push({
                    artisCode,
                    reason: 'Invalid date format. Use MM/DD/YY'
                });
                continue;
            }
            // Find the product by artisCode
            const product = yield Product_1.default.findOne({
                where: {
                    artisCodes: {
                        [sequelize_1.Op.contains]: [artisCode]
                    }
                },
                transaction: t,
                lock: true
            });
            if (!product) {
                skippedRows.push({
                    artisCode,
                    reason: 'Product not found'
                });
                continue;
            }
            try {
                // Create CORRECTION transaction - note we directly use the positive/negative amount
                yield Transaction_1.default.create({
                    productId: product.id,
                    type: TransactionType.CORRECTION,
                    quantity: correctionAmount,
                    date: parsedDate,
                    notes: reason,
                    includeInAvg: false // Corrections should never affect consumption averages
                }, { transaction: t });
                // Update product stock - add the correction amount (positive or negative)
                yield product.update({
                    currentStock: Number((Number(product.currentStock) + correctionAmount).toFixed(2)),
                    lastUpdated: new Date()
                }, { transaction: t });
                processedCorrections.push(artisCode);
            }
            catch (error) {
                skippedRows.push({
                    artisCode,
                    reason: `Error processing: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
            }
        }
        yield t.commit();
        res.json({
            message: 'Corrections processed successfully',
            processed: processedCorrections,
            skipped: skippedRows
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('Error processing corrections upload:', error);
        res.status(500).json({
            error: 'Failed to process corrections upload',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkUploadCorrections = bulkUploadCorrections;
