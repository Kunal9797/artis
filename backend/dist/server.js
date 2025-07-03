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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const sequelize_1 = __importDefault(require("./config/sequelize"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const distributor_routes_1 = __importDefault(require("./routes/distributor.routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const associations_1 = require("./models/associations");
const sales_routes_1 = __importDefault(require("./routes/sales.routes"));
const auth_1 = require("./middleware/auth");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
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
// Add global auth middleware for /api routes
exports.app.use('/api', (req, res, next) => {
    if (req.path === '/auth/login' || req.path === '/auth/register') {
        return next();
    }
    (0, auth_1.auth)(req, res, next);
});
// Swagger documentation route (must be before other routes)
exports.app.use('/api-docs', swagger_ui_express_1.default.serve);
exports.app.get('/api-docs', swagger_ui_express_1.default.setup(swagger_1.default));
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
exports.app.use('/api/distributors', distributor_routes_1.default);
exports.app.use('/api/sales', sales_routes_1.default);
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
// After database connection
(0, associations_1.initializeAssociations)();
const PORT = parseInt(process.env.PORT || '8099', 10);
// Determine database source
const isDatabaseUrlSet = !!process.env.DATABASE_URL;
const isSupabase = (_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.includes('supabase');
const databaseSource = isDatabaseUrlSet
    ? (isSupabase ? 'Supabase' : 'Render')
    : 'Local PostgreSQL';
exports.app.listen(PORT, '0.0.0.0', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`🗄️  Database: ${databaseSource}`);
    try {
        yield sequelize_1.default.authenticate();
        console.log('✓ Database connected');
        // Only run migrations in production
        if (process.env.NODE_ENV === 'production') {
            console.log('Running migrations...');
            try {
                const { stdout, stderr } = yield execAsync('npx sequelize-cli db:migrate');
                console.log('Migration output:', stdout);
                if (stderr)
                    console.error('Migration stderr:', stderr);
                console.log('✓ Migrations completed');
            }
            catch (migrationError) {
                console.error('Migration error:', migrationError);
                throw migrationError;
            }
        }
        // Skip sync for Supabase - schema is already set up
        if (!isSupabase) {
            yield sequelize_1.default.sync({ alter: true });
            console.log('✓ Models synced successfully');
        }
        else {
            console.log('✓ Using existing Supabase schema');
        }
    }
    catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
}));
exports.default = exports.app;
