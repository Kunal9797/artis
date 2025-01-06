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
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const testConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    const sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: true // Enable logging to see the actual connection attempt
    });
    try {
        yield sequelize.authenticate();
        console.log('✓ Connection successful!');
        console.log('Database URL:', process.env.DATABASE_URL);
    }
    catch (error) {
        console.error('✕ Connection failed:', error);
    }
    finally {
        yield sequelize.close();
    }
});
testConnection();
