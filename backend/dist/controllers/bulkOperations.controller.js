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
exports.clearAllOperations = exports.getOperationDetails = exports.deleteOperation = exports.getOperationsHistory = void 0;
const BulkOperation_1 = __importDefault(require("../models/BulkOperation"));
const User_1 = __importDefault(require("../models/User"));
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
// Get all bulk operations history
const getOperationsHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const operations = yield BulkOperation_1.default.findAll({
            include: [{
                    model: User_1.default,
                    as: 'uploader',
                    attributes: ['id', 'username', 'email', 'firstName', 'lastName']
                }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.json(operations);
    }
    catch (error) {
        console.error('Error fetching operations:', error);
        res.status(500).json({
            error: 'Failed to fetch operations',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getOperationsHistory = getOperationsHistory;
// Delete a specific operation
const deleteOperation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_2.default.transaction();
    try {
        const { id } = req.params;
        const operation = yield BulkOperation_1.default.findByPk(id, { transaction: t });
        if (!operation) {
            yield t.rollback();
            return res.status(404).json({ error: 'Operation not found' });
        }
        // Find all transactions associated with this operation
        const associatedTransactions = yield sequelize_2.default.query(`
      SELECT DISTINCT "productId" 
      FROM "Transactions" 
      WHERE "operationId" = :operationId
    `, {
            replacements: { operationId: id },
            type: sequelize_1.QueryTypes.SELECT,
            transaction: t
        });
        const affectedProductIds = associatedTransactions.map((row) => row.productId);
        console.log(`Deleting operation ${id}, affecting ${affectedProductIds.length} products`);
        // Delete all transactions associated with this operation
        const deletedCount = yield sequelize_2.default.query(`
      DELETE FROM "Transactions" 
      WHERE "operationId" = :operationId
    `, {
            replacements: { operationId: id },
            type: sequelize_1.QueryTypes.DELETE,
            transaction: t
        });
        console.log(`Deleted ${deletedCount} transactions`);
        // Update stock for affected products
        if (affectedProductIds.length > 0) {
            const { batchUpdateProductStock } = require('../utils/batchUpdateStock');
            yield batchUpdateProductStock(affectedProductIds, t);
            console.log(`Updated stock for ${affectedProductIds.length} products`);
        }
        // Delete the operation record
        yield operation.destroy({ transaction: t });
        yield t.commit();
        res.json({
            message: 'Operation deleted successfully',
            transactionsDeleted: deletedCount,
            productsUpdated: affectedProductIds.length
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('Error deleting operation:', error);
        res.status(500).json({
            error: 'Failed to delete operation',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.deleteOperation = deleteOperation;
// Get operation details
const getOperationDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const operation = yield BulkOperation_1.default.findByPk(id, {
            include: [{
                    model: User_1.default,
                    as: 'uploader',
                    attributes: ['id', 'username', 'email', 'firstName', 'lastName']
                }]
        });
        if (!operation) {
            return res.status(404).json({ error: 'Operation not found' });
        }
        res.json(operation);
    }
    catch (error) {
        console.error('Error fetching operation details:', error);
        res.status(500).json({
            error: 'Failed to fetch operation details',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getOperationDetails = getOperationDetails;
// Clear all operations history
const clearAllOperations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const t = yield sequelize_2.default.transaction();
    try {
        // Check if we should delete ALL transactions or just those with operationId
        // For now, we'll delete ALL transactions since operationId might not be set for older data
        const deleteAllTransactions = true; // You can make this configurable later
        // Find all products that have transactions
        const affectedProducts = yield sequelize_2.default.query(`
      SELECT DISTINCT "productId" 
      FROM "Transactions"
    `, {
            type: sequelize_1.QueryTypes.SELECT,
            transaction: t
        });
        const affectedProductIds = affectedProducts.map((row) => row.productId);
        console.log(`Clearing all operations, affecting ${affectedProductIds.length} products`);
        // Delete transactions based on the flag
        let deletedTransactions;
        if (deleteAllTransactions) {
            // Delete ALL transactions (for clearing all inventory data)
            deletedTransactions = yield sequelize_2.default.query(`
        DELETE FROM "Transactions"
      `, {
                type: sequelize_1.QueryTypes.DELETE,
                transaction: t
            });
            console.log(`Deleted ALL ${deletedTransactions} transactions`);
        }
        else {
            // Delete only transactions from bulk operations
            deletedTransactions = yield sequelize_2.default.query(`
        DELETE FROM "Transactions" 
        WHERE "operationId" IS NOT NULL
      `, {
                type: sequelize_1.QueryTypes.DELETE,
                transaction: t
            });
            console.log(`Deleted ${deletedTransactions} bulk operation transactions`);
        }
        // Update stock for affected products (reset to 0)
        if (affectedProductIds.length > 0) {
            // Since we're deleting all transactions, we can just reset stock to 0
            yield sequelize_2.default.query(`
        UPDATE "Products"
        SET 
          "currentStock" = 0,
          "avgConsumption" = 0,
          "lastUpdated" = NOW()
        WHERE id IN (${affectedProductIds.map(id => `'${id}'::uuid`).join(',')})
      `, {
                type: sequelize_1.QueryTypes.UPDATE,
                transaction: t
            });
            console.log(`Reset stock to 0 for ${affectedProductIds.length} products`);
        }
        // Delete all bulk operation records
        yield BulkOperation_1.default.destroy({
            where: {},
            transaction: t
        });
        yield t.commit();
        res.json({
            message: 'All operations cleared successfully',
            transactionsDeleted: typeof deletedTransactions === 'number' ? deletedTransactions : 0,
            productsUpdated: affectedProductIds.length
        });
    }
    catch (error) {
        yield t.rollback();
        console.error('Error clearing operations:', error);
        res.status(500).json({
            error: 'Failed to clear operations',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.clearAllOperations = clearAllOperations;
