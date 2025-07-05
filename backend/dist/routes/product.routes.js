"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const product_controller_1 = require("../controllers/product.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Special routes must come BEFORE parameter routes
router.delete('/delete-all', [auth_1.auth, auth_1.adminAuth], product_controller_1.deleteAllProducts);
router.get('/search/:query', auth_1.auth, product_controller_1.searchProducts);
router.get('/deleted', [auth_1.auth, auth_1.adminAuth], product_controller_1.getDeletedProducts);
router.post('/recover/:id', [auth_1.auth, auth_1.adminAuth], product_controller_1.recoverProduct);
// View routes (both admin and user)
router.get('/', auth_1.auth, product_controller_1.getAllProducts);
router.get('/:id', auth_1.auth, product_controller_1.getProduct);
// Modification routes (admin only)
router.post('/', auth_1.auth, auth_1.adminAuth, product_controller_1.createProduct);
router.put('/:id', auth_1.auth, auth_1.adminAuth, product_controller_1.updateProduct);
router.delete('/:id', auth_1.auth, auth_1.adminAuth, product_controller_1.deleteProduct);
router.post('/bulk', auth_1.auth, auth_1.adminAuth, upload_1.upload.single('file'), product_controller_1.bulkCreateProducts);
exports.default = router;
