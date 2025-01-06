"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const product_controller_1 = require("../controllers/product.controller");
const router = (0, express_1.Router)();
// Basic CRUD routes
router.get('/', product_controller_1.getAllProducts);
router.get('/:id', product_controller_1.getProduct);
router.post('/', product_controller_1.createProduct);
router.put('/:id', product_controller_1.updateProduct);
router.delete('/:id', product_controller_1.deleteProduct);
// Bulk operations
router.post('/bulk', upload_1.upload.single('file'), product_controller_1.bulkCreateProducts);
// Search
router.get('/search/:query', product_controller_1.searchProducts);
// Delete all products
router.delete('/all', product_controller_1.deleteAllProducts);
exports.default = router;
