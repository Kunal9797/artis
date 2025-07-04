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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sheets_manager_service_1 = require("../services/sheets-manager.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const sheetsManager = new sheets_manager_service_1.SheetsManagerService();
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
    try {
        const result = yield sheetsManager.syncConsumption();
        // Clear sheet if successful and no errors
        if (result.added > 0 && result.errors.length === 0) {
            yield sheetsManager.clearSheet('consumption');
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
    try {
        const result = yield sheetsManager.syncPurchases();
        // Clear sheet if successful and no errors
        if (result.added > 0 && result.errors.length === 0) {
            yield sheetsManager.clearSheet('purchases');
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
    try {
        const result = yield sheetsManager.syncInitialStock();
        // Clear sheet if successful and no errors
        if (result.added > 0 && result.errors.length === 0) {
            yield sheetsManager.clearSheet('initialStock');
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
    try {
        const result = yield sheetsManager.syncCorrections();
        // Clear sheet if successful and no errors
        if (result.added > 0 && result.errors.length === 0) {
            yield sheetsManager.clearSheet('corrections');
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
exports.default = router;
