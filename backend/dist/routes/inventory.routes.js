"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const inventory_controller_1 = require("../controllers/inventory.controller");
const inventory_controller_optimized_1 = __importDefault(require("../controllers/inventory.controller.optimized"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Inventory management
router.get('/', auth_1.auth, inventory_controller_1.getAllInventory);
router.get('/product/:productId', inventory_controller_1.getInventory);
router.get('/details/:id', auth_1.auth, inventory_controller_1.getInventoryDetails);
router.get('/recent', auth_1.auth, inventory_controller_1.getRecentTransactions);
router.get('/transactions/:productId', auth_1.auth, inventory_controller_1.getProductTransactions);
// Add test endpoint
router.post('/bulk-test', auth_1.auth, (req, res) => {
    console.log('Bulk test endpoint hit');
    res.json({ message: 'Test successful' });
});
// Bulk operations - Add auth middleware before adminAuth
router.post('/bulk', [auth_1.auth, auth_1.adminAuth], upload_1.upload.single('file'), inventory_controller_optimized_1.default);
router.post('/purchase', [auth_1.auth, auth_1.adminAuth], upload_1.upload.single('file'), inventory_controller_1.bulkUploadPurchaseOrder);
router.post('/corrections', [auth_1.auth, auth_1.adminAuth], upload_1.upload.single('file'), inventory_controller_1.bulkUploadCorrections);
router.delete('/clear', [auth_1.auth, auth_1.adminAuth], inventory_controller_1.clearInventory);
// Individual transactions
router.post('/transaction', [auth_1.auth, auth_1.adminAuth], inventory_controller_1.createTransaction);
exports.default = router;
