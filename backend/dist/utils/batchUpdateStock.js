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
exports.batchUpdateProductStock = batchUpdateProductStock;
exports.batchUpdateAllProductsStock = batchUpdateAllProductsStock;
const sequelize_1 = __importDefault(require("../config/sequelize"));
const sequelize_2 = require("sequelize");
/**
 * Batch update product stock and average consumption for multiple products
 * Much faster than updating products one by one
 */
function batchUpdateProductStock(productIds, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`Batch updating stock for ${productIds.length} products...`);
            // Create a proper UUID array for PostgreSQL
            const productIdList = productIds.map(id => `'${id}'::uuid`).join(',');
            // Update all products in a single query
            yield sequelize_1.default.query(`
      WITH product_stock AS (
        SELECT 
          p.id,
          COALESCE(SUM(
            CASE 
              WHEN t.type = 'IN' THEN t.quantity
              WHEN t.type = 'OUT' THEN -t.quantity
              WHEN t.type = 'CORRECTION' THEN t.quantity
            END
          ), 0) as total_stock,
          COALESCE(AVG(
            CASE 
              WHEN t.type = 'OUT' AND t."includeInAvg" = true 
                AND t.date >= CURRENT_DATE - INTERVAL '12 months'
              THEN t.quantity
            END
          ), 0) as avg_consumption
        FROM "Products" p
        LEFT JOIN "Transactions" t ON t."productId" = p.id
        WHERE p.id IN (${productIdList})
        GROUP BY p.id
      )
      UPDATE "Products" p
      SET 
        "currentStock" = ps.total_stock,
        "avgConsumption" = ps.avg_consumption,
        "lastUpdated" = NOW()
      FROM product_stock ps
      WHERE p.id = ps.id
    `, {
                type: sequelize_2.QueryTypes.UPDATE,
                transaction
            });
            console.log(`✅ Batch updated stock for ${productIds.length} products`);
        }
        catch (error) {
            console.error('Error in batch update:', error);
            throw error;
        }
    });
}
/**
 * Update all products that have transactions
 */
function batchUpdateAllProductsStock(transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Batch updating stock for all products with transactions...');
            const result = yield sequelize_1.default.query(`
      WITH product_stock AS (
        SELECT 
          p.id,
          COALESCE(SUM(
            CASE 
              WHEN t.type = 'IN' THEN t.quantity
              WHEN t.type = 'OUT' THEN -t.quantity
              WHEN t.type = 'CORRECTION' THEN t.quantity
            END
          ), 0) as total_stock,
          COALESCE(AVG(
            CASE 
              WHEN t.type = 'OUT' AND t."includeInAvg" = true 
                AND t.date >= CURRENT_DATE - INTERVAL '12 months'
              THEN t.quantity
            END
          ), 0) as avg_consumption
        FROM "Products" p
        LEFT JOIN "Transactions" t ON t."productId" = p.id
        WHERE EXISTS (SELECT 1 FROM "Transactions" WHERE "productId" = p.id)
        GROUP BY p.id
      )
      UPDATE "Products" p
      SET 
        "currentStock" = ps.total_stock,
        "avgConsumption" = ps.avg_consumption,
        "lastUpdated" = NOW()
      FROM product_stock ps
      WHERE p.id = ps.id
      RETURNING p.id
    `, {
                type: sequelize_2.QueryTypes.UPDATE,
                transaction
            });
            const updatedCount = result[1];
            console.log(`✅ Batch updated stock for ${updatedCount} products`);
            return updatedCount;
        }
        catch (error) {
            console.error('Error in batch update all:', error);
            throw error;
        }
    });
}
