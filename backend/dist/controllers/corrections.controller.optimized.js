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
exports.bulkUploadCorrections = void 0;
const Product_1 = __importDefault(require("../models/Product"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const BulkOperation_1 = __importDefault(require("../models/BulkOperation"));
const sequelize_1 = __importDefault(require("../config/sequelize"));
const XLSX = __importStar(require("xlsx"));
const batchUpdateStock_1 = require("../utils/batchUpdateStock");
// Optimized bulk corrections upload
const bulkUploadCorrections = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    console.log('=== Optimized bulkUploadCorrections called ===');
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('File received:', req.file.originalname, 'Size:', req.file.size);
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const t = yield sequelize_1.default.transaction();
    const skippedRows = [];
    const processedCorrections = [];
    try {
        // Create bulk operation record
        const operation = yield BulkOperation_1.default.create({
            type: 'correction',
            uploadedBy: userId,
            fileName: req.file.originalname,
            status: 'processing',
            metadata: { fileSize: req.file.size }
        }, { transaction: t });
        // Parse Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log('Parsed corrections:', data.length);
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
        const affectedProductIds = new Set();
        // Process each row
        for (const row of data) {
            // Skip any row that has "Instructions" or empty cells
            if (((_b = row['Artis Code']) === null || _b === void 0 ? void 0 : _b.toString().includes('Instructions')) ||
                !row['Artis Code'] ||
                !row['Date (MM/DD/YY)'] ||
                row['Correction Amount'] === undefined) {
                continue;
            }
            const artisCode = (_c = row['Artis Code']) === null || _c === void 0 ? void 0 : _c.toString();
            const rawDate = (_d = row['Date (MM/DD/YY)']) === null || _d === void 0 ? void 0 : _d.toString();
            const correctionAmount = parseFloat(row['Correction Amount'].toString());
            const reason = ((_e = row['Reason']) === null || _e === void 0 ? void 0 : _e.toString()) || 'Bulk correction';
            if (!artisCode || !rawDate || isNaN(correctionAmount)) {
                skippedRows.push({
                    artisCode: artisCode || 'unknown',
                    reason: 'Missing or invalid fields'
                });
                continue;
            }
            // Parse date - accepts MM/DD/YY, M/D/YY, M/D/Y formats or Excel serial numbers
            let parsedDate;
            try {
                // Check if it's an Excel serial number (numeric string)
                if (!isNaN(Number(rawDate)) && !rawDate.includes('/')) {
                    // Excel serial number to date conversion
                    const excelSerialNumber = parseInt(rawDate);
                    // Excel dates start from 1900-01-01 (serial number 1)
                    // JavaScript dates start from 1970-01-01
                    // Excel incorrectly treats 1900 as a leap year, so we need to subtract 2
                    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
                    parsedDate = new Date(excelEpoch.getTime() + excelSerialNumber * 24 * 60 * 60 * 1000);
                    if (isNaN(parsedDate.getTime())) {
                        throw new Error('Invalid Excel date');
                    }
                }
                else {
                    // Parse as string date
                    const dateParts = rawDate.split('/');
                    if (dateParts.length !== 3) {
                        throw new Error('Invalid date format');
                    }
                    const month = parseInt(dateParts[0]);
                    const day = parseInt(dateParts[1]);
                    const yearPart = dateParts[2];
                    // Handle year: if 1 or 2 digits, assume 2000s
                    let fullYear;
                    if (yearPart.length <= 2) {
                        fullYear = 2000 + parseInt(yearPart);
                    }
                    else {
                        fullYear = parseInt(yearPart);
                    }
                    // Validate month and day
                    if (month < 1 || month > 12 || day < 1 || day > 31) {
                        throw new Error('Invalid date values');
                    }
                    parsedDate = new Date(fullYear, month - 1, day);
                    if (isNaN(parsedDate.getTime())) {
                        throw new Error('Invalid date format');
                    }
                }
                // IMPORTANT: Validate the parsed date is reasonable (not in far future or past)
                const currentYear = new Date().getFullYear();
                const parsedYear = parsedDate.getFullYear();
                if (parsedYear < 2020 || parsedYear > currentYear + 1) {
                    throw new Error(`Date year ${parsedYear} is out of reasonable range (2020-${currentYear + 1})`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.log(`Date parsing failed for correction row: ${rawDate}, Error: ${errorMessage}`);
                skippedRows.push({
                    artisCode,
                    reason: `Invalid date: ${rawDate}. ${errorMessage}`
                });
                continue;
            }
            const product = productMap.get(artisCode);
            if (!product) {
                skippedRows.push({
                    artisCode,
                    reason: 'Product not found'
                });
                continue;
            }
            // Add to transactions
            transactionsToCreate.push({
                productId: product.id,
                type: 'CORRECTION',
                quantity: correctionAmount,
                date: parsedDate,
                notes: reason,
                includeInAvg: false,
                operationId: operation.id
            });
            affectedProductIds.add(product.id);
            processedCorrections.push(artisCode);
        }
        console.log('Creating corrections in bulk...');
        // Create all transactions in batches
        const batchSize = 100;
        for (let i = 0; i < transactionsToCreate.length; i += batchSize) {
            const batch = transactionsToCreate.slice(i, i + batchSize);
            yield Transaction_1.default.bulkCreate(batch, { transaction: t });
            console.log(`Created ${Math.min(i + batchSize, transactionsToCreate.length)}/${transactionsToCreate.length} corrections`);
        }
        // Update operation status
        yield operation.update({
            status: skippedRows.length > 0 ? 'partial' : 'completed',
            recordsTotal: processedCorrections.length + skippedRows.length,
            recordsProcessed: processedCorrections.length,
            recordsFailed: skippedRows.length,
            metadata: Object.assign(Object.assign({}, operation.metadata), { transactionsCreated: transactionsToCreate.length })
        }, { transaction: t });
        // Update product stock values using batch update
        if (affectedProductIds.size > 0) {
            console.log('Updating product stock values...');
            yield (0, batchUpdateStock_1.batchUpdateProductStock)(Array.from(affectedProductIds), t);
        }
        yield t.commit();
        console.log('=== Corrections upload completed ===');
        console.log(`Processed: ${processedCorrections.length} corrections`);
        console.log(`Created: ${transactionsToCreate.length} transactions`);
        console.log(`Updated stock for: ${affectedProductIds.size} products`);
        console.log(`Skipped: ${skippedRows.length} corrections`);
        // Send response
        res.json({
            message: 'Corrections processed successfully',
            processed: processedCorrections,
            skipped: skippedRows,
            operation: {
                id: operation.id,
                status: operation.status
            }
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('=== Corrections upload error ===', error);
        res.status(500).json({
            error: 'Failed to process corrections upload',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.bulkUploadCorrections = bulkUploadCorrections;
exports.default = exports.bulkUploadCorrections;
