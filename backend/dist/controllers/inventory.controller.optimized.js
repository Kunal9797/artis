"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUploadInventory = void 0;
var Product_1 = require("../models/Product");
var Transaction_1 = require("../models/Transaction");
var BulkOperation_1 = require("../models/BulkOperation");
var sequelize_1 = require("../config/sequelize");
var XLSX = require("xlsx");
var updateProductStock_1 = require("../utils/updateProductStock");
// Define TransactionType enum
var TransactionType;
(function (TransactionType) {
    TransactionType["IN"] = "IN";
    TransactionType["OUT"] = "OUT";
    TransactionType["CORRECTION"] = "CORRECTION";
})(TransactionType || (TransactionType = {}));
// Optimized bulk upload that processes in batches
var bulkUploadInventory = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, t, skippedRows, processedProducts, operation, workbook, worksheet, rawData, _a, firstRow, secondRow_1, columnMap_1, headers_1, consumptionDates, data, allProducts, productMap_1, transactionsToCreate, processedCount, _i, data_1, row, artisCode, product, _b, consumptionDates_1, _c, date, column, consumption, initialStock, batchSize, i, batch, uniqueProductIds, _d, uniqueProductIds_1, productId, error_1;
    var _e, _f, _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                console.log('=== Optimized bulkUploadInventory called ===');
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ error: 'No file uploaded' })];
                }
                console.log('File received:', req.file.originalname, 'Size:', req.file.size);
                userId = (_e = req.user) === null || _e === void 0 ? void 0 : _e.id;
                return [4 /*yield*/, sequelize_1.default.transaction()];
            case 1:
                t = _h.sent();
                skippedRows = [];
                processedProducts = [];
                _h.label = 2;
            case 2:
                _h.trys.push([2, 15, , 17]);
                return [4 /*yield*/, BulkOperation_1.default.create({
                        type: 'consumption',
                        uploadedBy: userId,
                        fileName: req.file.originalname,
                        status: 'processing',
                        metadata: { fileSize: req.file.size }
                    }, { transaction: t })];
            case 3:
                operation = _h.sent();
                workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
                worksheet = workbook.Sheets[workbook.SheetNames[0]];
                rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
                console.log('Raw data rows:', rawData.length);
                _a = rawData, firstRow = _a[0], secondRow_1 = _a[1];
                columnMap_1 = {
                    'DESIGN CODE': 'OUR CODE',
                    'OPEN': 'IN'
                };
                headers_1 = firstRow.map(function (header, index) {
                    var _a;
                    if (header === 'SNO')
                        return 'SNO';
                    if (typeof header === 'string' && columnMap_1[header]) {
                        return columnMap_1[header];
                    }
                    return ((_a = secondRow_1[index]) === null || _a === void 0 ? void 0 : _a.toString()) || header.toString();
                });
                consumptionDates = headers_1
                    .map(function (header, index) {
                    if (typeof header === 'string' && header.includes('/')) {
                        var _a = header.split('/'), day = _a[0], month = _a[1], year = _a[2];
                        return {
                            date: new Date(parseInt('20' + year), parseInt(month) - 1, parseInt(day)),
                            column: header,
                            index: index
                        };
                    }
                    return null;
                })
                    .filter(function (date) { return date !== null; });
                data = rawData.slice(2).map(function (row) {
                    return headers_1.reduce(function (obj, header, index) {
                        obj[header.toString()] = row[index];
                        return obj;
                    }, {});
                });
                console.log('Processed data rows:', data.length);
                console.log('Consumption dates found:', consumptionDates.length);
                return [4 /*yield*/, Product_1.default.findAll({
                        attributes: ['id', 'artisCodes', 'currentStock'],
                        transaction: t
                    })];
            case 4:
                allProducts = _h.sent();
                productMap_1 = new Map();
                allProducts.forEach(function (product) {
                    product.artisCodes.forEach(function (code) {
                        productMap_1.set(code.toString(), product);
                    });
                });
                transactionsToCreate = [];
                processedCount = 0;
                // Process each row
                for (_i = 0, data_1 = data; _i < data_1.length; _i++) {
                    row = data_1[_i];
                    artisCode = (_f = row['OUR CODE']) === null || _f === void 0 ? void 0 : _f.toString();
                    if (!artisCode) {
                        skippedRows.push({ artisCode: 'unknown', reason: 'Missing DESIGN CODE' });
                        continue;
                    }
                    product = productMap_1.get(artisCode);
                    if (!product) {
                        skippedRows.push({ artisCode: artisCode, reason: 'Product not found' });
                        continue;
                    }
                    // Add consumption transactions
                    for (_b = 0, consumptionDates_1 = consumptionDates; _b < consumptionDates_1.length; _b++) {
                        _c = consumptionDates_1[_b], date = _c.date, column = _c.column;
                        consumption = parseFloat(((_g = row[column]) === null || _g === void 0 ? void 0 : _g.toString()) || '0') || 0;
                        if (consumption > 0) {
                            transactionsToCreate.push({
                                productId: product.id,
                                type: TransactionType.OUT,
                                quantity: consumption,
                                date: date,
                                notes: "Bulk upload - ".concat(date.toLocaleDateString()),
                                includeInAvg: true,
                                operationId: operation.id
                            });
                        }
                    }
                    initialStock = row['IN'] ? parseFloat(row['IN'].toString()) : 0;
                    if (initialStock > 0) {
                        transactionsToCreate.push({
                            productId: product.id,
                            type: TransactionType.IN,
                            quantity: initialStock,
                            date: new Date(),
                            notes: 'Initial Stock',
                            includeInAvg: false,
                            operationId: operation.id
                        });
                    }
                    processedProducts.push(artisCode);
                    processedCount++;
                    // Log progress every 25 products
                    if (processedCount % 25 === 0) {
                        console.log("Processed ".concat(processedCount, "/").concat(data.length, " products..."));
                    }
                }
                console.log('Creating transactions in bulk...');
                batchSize = 100;
                i = 0;
                _h.label = 5;
            case 5:
                if (!(i < transactionsToCreate.length)) return [3 /*break*/, 8];
                batch = transactionsToCreate.slice(i, i + batchSize);
                return [4 /*yield*/, Transaction_1.default.bulkCreate(batch, { transaction: t })];
            case 6:
                _h.sent();
                console.log("Created ".concat(Math.min(i + batchSize, transactionsToCreate.length), "/").concat(transactionsToCreate.length, " transactions"));
                _h.label = 7;
            case 7:
                i += batchSize;
                return [3 /*break*/, 5];
            case 8: 
            // Update operation status
            return [4 /*yield*/, operation.update({
                    status: skippedRows.length > 0 ? 'partial' : 'completed',
                    recordsTotal: data.length,
                    recordsProcessed: processedProducts.length,
                    recordsFailed: skippedRows.length,
                    metadata: __assign(__assign({}, operation.metadata), { transactionsCreated: transactionsToCreate.length })
                }, { transaction: t })];
            case 9:
                // Update operation status
                _h.sent();
                // Update product stock and consumption values
                console.log('Updating product stock values...');
                uniqueProductIds = __spreadArray([], new Set(transactionsToCreate.map(function (t) { return t.productId; })), true);
                _d = 0, uniqueProductIds_1 = uniqueProductIds;
                _h.label = 10;
            case 10:
                if (!(_d < uniqueProductIds_1.length)) return [3 /*break*/, 13];
                productId = uniqueProductIds_1[_d];
                return [4 /*yield*/, (0, updateProductStock_1.updateProductStock)(productId, t)];
            case 11:
                _h.sent();
                _h.label = 12;
            case 12:
                _d++;
                return [3 /*break*/, 10];
            case 13: return [4 /*yield*/, t.commit()];
            case 14:
                _h.sent();
                console.log('=== Upload completed ===');
                console.log("Processed: ".concat(processedProducts.length, " products"));
                console.log("Created: ".concat(transactionsToCreate.length, " transactions"));
                console.log("Updated stock for: ".concat(uniqueProductIds.length, " products"));
                console.log("Skipped: ".concat(skippedRows.length, " products"));
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
                return [3 /*break*/, 17];
            case 15:
                error_1 = _h.sent();
                return [4 /*yield*/, t.rollback()];
            case 16:
                _h.sent();
                console.error('=== Upload error ===', error_1);
                res.status(500).json({
                    error: 'Failed to process inventory upload',
                    details: error_1 instanceof Error ? error_1.message : 'Unknown error'
                });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); };
exports.bulkUploadInventory = bulkUploadInventory;
exports.default = exports.bulkUploadInventory;
