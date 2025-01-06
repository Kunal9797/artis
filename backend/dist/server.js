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
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const sequelize_1 = __importDefault(require("./config/sequelize"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const database_1 = __importDefault(require("./config/database"));
// Load environment variables
dotenv_1.default.config();
// Initialize express app
exports.app = (0, express_1.default)();
// Middleware
exports.app.use((0, cors_1.default)({
    origin: [
        'https://artis-rust.vercel.app',
        'https://artis-backend.onrender.com',
        'http://localhost:3000',
        'http://localhost:8099'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
// Initialize database connection for each request
exports.app.use((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sequelize_1.default.authenticate();
        next();
    }
    catch (error) {
        console.error('Unable to connect to database:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
}));
// Routes
exports.app.use('/api/auth', auth_routes_1.default);
exports.app.use('/api/products', product_routes_1.default);
exports.app.use('/api/inventory', inventory_routes_1.default);
// Test route
exports.app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});
// Add this after your routes
exports.app.get('/api/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sequelize_1.default.authenticate();
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    catch (error) {
        res.status(500).json({ error: 'Database connection failed' });
    }
}));
const PORT = parseInt(process.env.PORT || '8099', 10);
exports.app.listen(PORT, '0.0.0.0', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log('Database initialization starting...');
    try {
        yield (0, database_1.default)();
        console.log('Database initialization completed');
    }
    catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}));
exports.default = exports.app;
