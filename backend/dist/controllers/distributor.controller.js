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
exports.deleteAllDistributors = exports.createTestDistributor = exports.getAllDistributors = exports.importDistributors = void 0;
const XLSX = __importStar(require("xlsx"));
const Distributor_1 = __importDefault(require("../models/Distributor"));
const importDistributors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: ''
        });
        const results = [];
        const errors = [];
        for (const row of data) {
            try {
                const distributor = {
                    name: row.name,
                    city: row.city,
                    state: row.state,
                    phoneNumber: row.phoneNumber.toString(),
                    catalogs: row.catalog.split(',').map(c => c.trim()).filter(c => c),
                };
                const created = yield Distributor_1.default.create(distributor);
                results.push(created);
            }
            catch (error) {
                errors.push(`Error processing ${row.name}: ${error.message}`);
            }
        }
        res.json({
            message: 'Import completed',
            success: results.length,
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (error) {
        console.error('Error importing distributors:', error);
        res.status(500).json({ error: 'Error importing distributors' });
    }
});
exports.importDistributors = importDistributors;
const getAllDistributors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const distributors = yield Distributor_1.default.findAll();
        res.json(distributors);
    }
    catch (error) {
        console.error('Error fetching distributors:', error);
        res.status(500).json({ error: 'Error fetching distributors' });
    }
});
exports.getAllDistributors = getAllDistributors;
const createTestDistributor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const testDistributor = yield Distributor_1.default.create({
            name: "Test Distributor",
            city: "Mumbai",
            state: "Maharashtra",
            phoneNumber: "1234567890",
            catalogs: ["Match Graphics", "Surface Décor"]
        });
        res.json(testDistributor);
    }
    catch (error) {
        console.error('Error creating test distributor:', error);
        res.status(500).json({ error: 'Error creating test distributor' });
    }
});
exports.createTestDistributor = createTestDistributor;
const deleteAllDistributors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield Distributor_1.default.destroy({ where: {} });
        res.json({ message: 'All distributors deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting distributors:', error);
        res.status(500).json({ error: 'Error deleting distributors' });
    }
});
exports.deleteAllDistributors = deleteAllDistributors;
