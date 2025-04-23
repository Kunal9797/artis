"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const distributor_controller_1 = require("../controllers/distributor.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// View routes (both admin and user)
router.get('/', auth_1.auth, distributor_controller_1.getAllDistributors);
// Admin only routes
router.get('/test', auth_1.adminAuth, distributor_controller_1.createTestDistributor);
router.post('/import', auth_1.adminAuth, upload.single('file'), distributor_controller_1.importDistributors);
router.delete('/', auth_1.adminAuth, distributor_controller_1.deleteAllDistributors);
exports.default = router;
