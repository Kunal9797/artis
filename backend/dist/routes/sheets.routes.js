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
const express_1 = require("express");
const sheets_manager_optimized_service_1 = __importDefault(require("../services/sheets-manager-optimized.service"));
const auth_1 = require("../middleware/auth");
const sequelize_1 = require("sequelize");
const router = (0, express_1.Router)();
// Use optimized service for better performance with large datasets
const sheetsManager = new sheets_manager_optimized_service_1.default();
/**
 * @swagger
 * /api/sheets/pending:
 *   get:
 *     summary: Get count of pending data in Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending data counts
 */
router.get('/pending', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const summary = yield sheetsManager.getPendingSummary();
        res.json({ success: true, data: summary });
    }
    catch (error) {
        console.error('Error getting pending summary:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get pending data'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/sync/consumption:
 *   post:
 *     summary: Sync consumption data from Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync/consumption', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Set user ID for tracking
        sheetsManager.setUserId(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const { archiveName } = req.body; // Optional archive name from request
        const result = yield sheetsManager.syncConsumption();
        // Clear sheet if we processed some records (even with errors)
        if (result.added > 0) {
            yield sheetsManager.clearSheet('consumption', archiveName);
        }
        res.json(Object.assign({ success: true, message: `Synced ${result.added} consumption records` }, result));
    }
    catch (error) {
        console.error('Error syncing consumption:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to sync consumption data'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/sync/purchases:
 *   post:
 *     summary: Sync purchases data from Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync/purchases', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Set user ID for tracking
        sheetsManager.setUserId(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const { archiveName } = req.body; // Optional archive name from request
        const result = yield sheetsManager.syncPurchases();
        // Clear sheet if we processed some records (even with errors)
        if (result.added > 0) {
            yield sheetsManager.clearSheet('purchases', archiveName);
        }
        res.json(Object.assign({ success: true, message: `Synced ${result.added} purchase records` }, result));
    }
    catch (error) {
        console.error('Error syncing purchases:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to sync purchase data'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/sync/initial-stock:
 *   post:
 *     summary: Sync initial stock data from Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync/initial-stock', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Set user ID for tracking
        sheetsManager.setUserId(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const { archiveName } = req.body; // Optional archive name from request
        const result = yield sheetsManager.syncInitialStock();
        // Clear sheet if we processed some records (even with errors)
        if (result.added > 0) {
            yield sheetsManager.clearSheet('initialStock', archiveName);
        }
        res.json(Object.assign({ success: true, message: `Set initial stock for ${result.added} products` }, result));
    }
    catch (error) {
        console.error('Error syncing initial stock:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to sync initial stock'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/sync/corrections:
 *   post:
 *     summary: Sync corrections data from Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync/corrections', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Set user ID for tracking
        sheetsManager.setUserId(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || '');
        const { archiveName } = req.body; // Optional archive name from request
        const result = yield sheetsManager.syncCorrections();
        // Clear sheet if we processed some records (even with errors)
        if (result.added > 0) {
            yield sheetsManager.clearSheet('corrections', archiveName);
        }
        res.json(Object.assign({ success: true, message: `Applied ${result.added} corrections` }, result));
    }
    catch (error) {
        console.error('Error syncing corrections:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to sync corrections'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/archives/{type}:
 *   get:
 *     summary: Get list of archive tabs for a sheet type
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [consumption, purchases, corrections, initialStock]
 *     responses:
 *       200:
 *         description: List of archive tab names
 */
router.get('/archives/:type', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type } = req.params;
        const archives = yield sheetsManager.getArchiveTabs(type);
        res.json({ success: true, data: archives });
    }
    catch (error) {
        console.error('Error getting archives:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get archives'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/setup/{type}:
 *   post:
 *     summary: Setup Google Sheet with template
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [consumption, purchases, corrections]
 *     responses:
 *       200:
 *         description: Setup complete
 */
router.post('/setup/:type', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type } = req.params;
        switch (type) {
            case 'consumption':
                yield sheetsManager.setupConsumptionSheet();
                break;
            case 'purchases':
                yield sheetsManager.setupPurchasesSheet();
                break;
            case 'corrections':
                yield sheetsManager.setupCorrectionsSheet();
                break;
            case 'initialStock':
                yield sheetsManager.setupInitialStockSheet();
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid sheet type'
                });
        }
        res.json({
            success: true,
            message: `${type} sheet setup complete`
        });
    }
    catch (error) {
        console.error('Error setting up sheet:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to setup sheet'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/clear-inventory:
 *   post:
 *     summary: Clear all inventory data
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory cleared successfully
 */
router.post('/clear-inventory', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Only allow admin users to clear inventory
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Only admin users can clear inventory'
            });
        }
        // Import models
        const { Transaction, Product } = yield Promise.resolve().then(() => __importStar(require('../models')));
        const sequelize = (yield Promise.resolve().then(() => __importStar(require('../config/sequelize')))).default;
        // Start a transaction
        const t = yield sequelize.transaction();
        try {
            // Delete all transactions
            const deletedTransactions = yield Transaction.destroy({
                where: {},
                transaction: t
            });
            // Reset all product stock levels and consumption
            yield sequelize.query(`UPDATE "Products" 
         SET "currentStock" = 0, 
             "avgConsumption" = 0,
             "updatedAt" = NOW()`, { transaction: t });
            // Get count of products
            const productCount = yield Product.count({ transaction: t });
            // Commit the transaction
            yield t.commit();
            res.json({
                success: true,
                message: 'Inventory cleared successfully',
                details: {
                    transactionsDeleted: deletedTransactions,
                    productsReset: productCount
                }
            });
        }
        catch (error) {
            yield t.rollback();
            throw error;
        }
    }
    catch (error) {
        console.error('Error clearing inventory:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to clear inventory'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/sync-history:
 *   get:
 *     summary: Get sync history
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Sync history records
 */
router.get('/sync-history', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { SyncHistory } = yield Promise.resolve().then(() => __importStar(require('../models')));
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const { count, rows } = yield SyncHistory.findAndCountAll({
            limit,
            offset,
            order: [['syncDate', 'DESC']],
            include: [{
                    model: (yield Promise.resolve().then(() => __importStar(require('../models')))).User,
                    as: 'user',
                    attributes: ['id', 'username', 'email']
                }]
        });
        res.json({
            success: true,
            data: {
                total: count,
                records: rows
            }
        });
    }
    catch (error) {
        console.error('Error getting sync history:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get sync history'
        });
    }
}));
/**
 * @swagger
 * /api/sheets/undo-sync/:syncBatchId:
 *   post:
 *     summary: Undo a specific sync operation
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: syncBatchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Undo successful
 */
router.post('/undo-sync/:syncBatchId', auth_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Only allow admin users to undo sync
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Only admin users can undo sync operations'
            });
        }
        const { syncBatchId } = req.params;
        const { SyncHistory, Transaction, Product } = yield Promise.resolve().then(() => __importStar(require('../models')));
        const sequelize = (yield Promise.resolve().then(() => __importStar(require('../config/sequelize')))).default;
        // Get the specific sync
        const syncToUndo = yield SyncHistory.findOne({
            where: {
                syncBatchId,
                status: ['completed', 'failed']
            }
        });
        if (!syncToUndo) {
            return res.status(400).json({
                success: false,
                error: 'Sync operation not found or already undone'
            });
        }
        const t = yield sequelize.transaction();
        try {
            // Get all affected products BEFORE deleting transactions
            const affectedProducts = yield sequelize.query(`SELECT DISTINCT "productId" 
         FROM "Transactions" 
         WHERE "syncBatchId" = :syncBatchId`, {
                replacements: { syncBatchId: syncToUndo.syncBatchId },
                type: sequelize_1.QueryTypes.SELECT,
                transaction: t
            });
            // Delete all transactions from this sync batch
            const deletedCount = yield Transaction.destroy({
                where: { syncBatchId: syncToUndo.syncBatchId },
                transaction: t
            });
            // Mark the sync as undone
            yield syncToUndo.update({ status: 'undone' }, { transaction: t });
            // Recalculate stock for affected products
            for (const { productId } of affectedProducts) {
                // Calculate current stock from all remaining transactions
                const stockResult = yield sequelize.query(`SELECT COALESCE(SUM(
            CASE 
              WHEN type = 'IN' THEN quantity
              WHEN type = 'OUT' THEN -quantity
              WHEN type = 'CORRECTION' THEN quantity
            END
          ), 0) as total_stock
          FROM "Transactions"
          WHERE "productId" = :productId`, {
                    replacements: { productId },
                    type: sequelize_1.QueryTypes.SELECT,
                    transaction: t
                });
                const currentStock = parseFloat(stockResult[0].total_stock) || 0;
                // Calculate average monthly consumption
                const avgResult = yield sequelize.query(`SELECT 
            COUNT(DISTINCT DATE_TRUNC('month', date)) as months,
            COALESCE(SUM(quantity), 0) as total_consumption
          FROM "Transactions"
          WHERE "productId" = :productId
            AND type = 'OUT'
            AND "includeInAvg" = true`, {
                    replacements: { productId },
                    type: sequelize_1.QueryTypes.SELECT,
                    transaction: t
                });
                const months = parseInt(avgResult[0].months) || 1;
                const totalConsumption = parseFloat(avgResult[0].total_consumption) || 0;
                const avgConsumption = totalConsumption / months;
                // Update product
                yield sequelize.query(`UPDATE "Products" 
           SET "currentStock" = :currentStock,
               "avgConsumption" = :avgConsumption,
               "updatedAt" = NOW()
           WHERE "id" = :productId`, {
                    replacements: { currentStock, avgConsumption, productId },
                    transaction: t
                });
            }
            yield t.commit();
            res.json({
                success: true,
                message: `Successfully undid ${syncToUndo.syncType} sync`,
                details: {
                    syncType: syncToUndo.syncType,
                    syncDate: syncToUndo.syncDate,
                    transactionsDeleted: deletedCount,
                    productsRecalculated: affectedProducts.length
                }
            });
        }
        catch (error) {
            yield t.rollback();
            throw error;
        }
    }
    catch (error) {
        console.error('Error undoing sync:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to undo sync'
        });
    }
}));
exports.default = router;
