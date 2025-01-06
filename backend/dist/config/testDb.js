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
const database_1 = __importDefault(require("./database"));
const models_1 = require("../models");
const testDatabase = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.default.authenticate();
        console.log('✓ Database connection successful');
        yield database_1.default.sync({ force: false });
        console.log('✓ Models synchronized');
        const tables = yield database_1.default.showAllSchemas({ logging: console.log });
        console.log('\nDatabase tables:');
        console.log(tables);
        const userCount = yield models_1.User.count();
        console.log(`\nUsers in database: ${userCount}`);
    }
    catch (error) {
        console.error('Database test failed:', error);
    }
    finally {
        yield database_1.default.close();
    }
});
testDatabase();
