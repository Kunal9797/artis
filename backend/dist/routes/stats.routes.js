"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stats_controller_1 = require("../controllers/stats.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Dashboard statistics endpoints using database views
router.get('/dashboard', auth_1.auth, stats_controller_1.getDashboardStats);
router.get('/suppliers', auth_1.auth, stats_controller_1.getSupplierStats);
router.get('/categories', auth_1.auth, stats_controller_1.getCategoryStats);
exports.default = router;
