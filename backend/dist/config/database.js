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
exports.syncDatabase = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
dotenv_1.default.config();
const sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL || '', {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    define: {
        timestamps: true,
        underscored: false
    }
});
// Add this sync function
const syncDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Starting database sync and migrations...');
        // First check connection
        yield sequelize.authenticate();
        console.log('✓ Database connected');
        // Run migrations
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
        // Sync models
        yield sequelize.sync({ alter: true });
        console.log('✓ Models synced successfully');
        console.log('Database initialization completed successfully');
    }
    catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
});
exports.syncDatabase = syncDatabase;
// Call sync when this file is run directly
if (require.main === module) {
    (0, exports.syncDatabase)().catch(error => {
        console.error('Failed to sync database:', error);
        process.exit(1);
    });
}
exports.default = sequelize;
