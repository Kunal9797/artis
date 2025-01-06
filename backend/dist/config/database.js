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
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const sequelize_1 = __importDefault(require("./sequelize"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
dotenv_1.default.config();
const syncDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Starting database sync and migrations...');
        yield sequelize_1.default.authenticate();
        console.log('✓ Database connected');
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
        yield sequelize_1.default.sync({ alter: true });
        console.log('✓ Models synced successfully');
        console.log('Database initialization completed successfully');
    }
    catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
});
if (require.main === module) {
    syncDatabase().catch(error => {
        console.error('Failed to sync database:', error);
        process.exit(1);
    });
}
exports.default = syncDatabase;
