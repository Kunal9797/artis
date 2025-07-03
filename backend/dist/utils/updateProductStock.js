"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductStock = updateProductStock;
exports.updateAllProductsStock = updateAllProductsStock;
var Product_1 = require("../models/Product");
var sequelize_1 = require("../config/sequelize");
var sequelize_2 = require("sequelize");
/**
 * Update product's currentStock and avgConsumption based on transactions
 */
function updateProductStock(productId, transaction) {
    return __awaiter(this, void 0, void 0, function () {
        var stockResult, currentStock, avgResult, avgConsumption, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, sequelize_1.default.query("\n      SELECT COALESCE(SUM(\n        CASE \n          WHEN type = 'IN' THEN quantity\n          WHEN type = 'OUT' THEN -quantity\n          WHEN type = 'CORRECTION' THEN quantity\n        END\n      ), 0) as total_stock\n      FROM \"Transactions\"\n      WHERE \"productId\" = :productId\n    ", {
                            replacements: { productId: productId },
                            type: sequelize_2.QueryTypes.SELECT,
                            transaction: transaction
                        })];
                case 1:
                    stockResult = _a.sent();
                    currentStock = parseFloat(stockResult[0].total_stock) || 0;
                    return [4 /*yield*/, sequelize_1.default.query("\n      SELECT COALESCE(AVG(quantity), 0) as avg_consumption\n      FROM \"Transactions\"\n      WHERE \"productId\" = :productId\n        AND type = 'OUT'\n        AND \"includeInAvg\" = true\n        AND date >= CURRENT_DATE - INTERVAL '12 months'\n    ", {
                            replacements: { productId: productId },
                            type: sequelize_2.QueryTypes.SELECT,
                            transaction: transaction
                        })];
                case 2:
                    avgResult = _a.sent();
                    avgConsumption = parseFloat(avgResult[0].avg_consumption) || 0;
                    // Update the product
                    return [4 /*yield*/, Product_1.default.update({
                            currentStock: currentStock,
                            avgConsumption: avgConsumption,
                            lastUpdated: new Date()
                        }, {
                            where: { id: productId },
                            transaction: transaction
                        })];
                case 3:
                    // Update the product
                    _a.sent();
                    console.log("Updated product ".concat(productId, ": stock=").concat(currentStock, ", avg=").concat(avgConsumption));
                    return [2 /*return*/, { currentStock: currentStock, avgConsumption: avgConsumption }];
                case 4:
                    error_1 = _a.sent();
                    console.error('Error updating product stock:', error_1);
                    throw error_1;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Batch update all products' stock and consumption
 */
function updateAllProductsStock(transaction) {
    return __awaiter(this, void 0, void 0, function () {
        var productsWithTransactions, updated, _i, _a, row, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, , 7]);
                    console.log('Updating stock for all products...');
                    return [4 /*yield*/, sequelize_1.default.query("\n      SELECT DISTINCT \"productId\" FROM \"Transactions\"\n    ", {
                            type: sequelize_2.QueryTypes.SELECT,
                            transaction: transaction
                        })];
                case 1:
                    productsWithTransactions = _b.sent();
                    console.log("Found ".concat(productsWithTransactions.length, " products with transactions"));
                    updated = 0;
                    _i = 0, _a = productsWithTransactions;
                    _b.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    row = _a[_i];
                    return [4 /*yield*/, updateProductStock(row.productId, transaction)];
                case 3:
                    _b.sent();
                    updated++;
                    if (updated % 50 === 0) {
                        console.log("Updated ".concat(updated, "/").concat(productsWithTransactions.length, " products..."));
                    }
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("\u2705 Updated stock for ".concat(updated, " products"));
                    return [2 /*return*/, updated];
                case 6:
                    error_2 = _b.sent();
                    console.error('Error updating all products stock:', error_2);
                    throw error_2;
                case 7: return [2 /*return*/];
            }
        });
    });
}
