"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const inventory_controller_1 = require("../controllers/inventory.controller");
const router = (0, express_1.Router)();
// Inventory management
router.get('/', inventory_controller_1.getAllInventory);
router.get('/product/:productId', inventory_controller_1.getInventory);
router.get('/details/:id', inventory_controller_1.getInventoryDetails);
router.get('/transactions/recent', inventory_controller_1.getRecentTransactions);
router.get('/transactions/:productId', inventory_controller_1.getProductTransactions);
// Bulk operations
router.post('/upload', upload_1.upload.single('file'), inventory_controller_1.bulkUploadInventory);
router.post('/purchase-order/upload', upload_1.upload.single('file'), inventory_controller_1.bulkUploadPurchaseOrder);
router.post('/clear', inventory_controller_1.clearInventory);
// Individual transactions
router.post('/transaction', inventory_controller_1.createTransaction);
exports.default = router;
