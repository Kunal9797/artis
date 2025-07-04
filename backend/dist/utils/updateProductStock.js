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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductStock = updateProductStock;
exports.updateAllProductsStock = updateAllProductsStock;
const Product_1 = __importDefault(require("../models/Product"));
const sequelize_1 = __importDefault(require("../config/sequelize"));
const sequelize_2 = require("sequelize");
/**
 * Update product's currentStock and avgConsumption based on transactions
 */
function updateProductStock(productId, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Calculate current stock from all transactions
            const stockResult = yield sequelize_1.default.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN type = 'IN' THEN quantity
          WHEN type = 'OUT' THEN -quantity
          WHEN type = 'CORRECTION' THEN quantity
        END
      ), 0) as total_stock
      FROM "Transactions"
      WHERE "productId" = :productId
    `, {
                replacements: { productId },
                type: sequelize_2.QueryTypes.SELECT,
                transaction
            });
            const currentStock = parseFloat(stockResult[0].total_stock) || 0;
            // Calculate average consumption (last 12 months to accommodate older data)
            const avgResult = yield sequelize_1.default.query(`
      SELECT COALESCE(AVG(quantity), 0) as avg_consumption
      FROM "Transactions"
      WHERE "productId" = :productId
        AND type = 'OUT'
        AND "includeInAvg" = true
        AND date >= CURRENT_DATE - INTERVAL '12 months'
    `, {
                replacements: { productId },
                type: sequelize_2.QueryTypes.SELECT,
                transaction
            });
            const avgConsumption = parseFloat(avgResult[0].avg_consumption) || 0;
            // Update the product
            yield Product_1.default.update({
                currentStock,
                avgConsumption,
                lastUpdated: new Date()
            }, {
                where: { id: productId },
                transaction
            });
            console.log(`Updated product ${productId}: stock=${currentStock}, avg=${avgConsumption}`);
            return { currentStock, avgConsumption };
        }
        catch (error) {
            console.error('Error updating product stock:', error);
            throw error;
        }
    });
}
/**
 * Batch update all products' stock and consumption
 */
function updateAllProductsStock(transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Updating stock for all products...');
            // Get all products that have transactions
            const productsWithTransactions = yield sequelize_1.default.query(`
      SELECT DISTINCT "productId" FROM "Transactions"
    `, {
                type: sequelize_2.QueryTypes.SELECT,
                transaction
            });
            console.log(`Found ${productsWithTransactions.length} products with transactions`);
            // Update each product
            let updated = 0;
            for (const row of productsWithTransactions) {
                yield updateProductStock(row.productId, transaction);
                updated++;
                if (updated % 50 === 0) {
                    console.log(`Updated ${updated}/${productsWithTransactions.length} products...`);
                }
            }
            console.log(`✅ Updated stock for ${updated} products`);
            return updated;
        }
        catch (error) {
            console.error('Error updating all products stock:', error);
            throw error;
        }
    });
}
