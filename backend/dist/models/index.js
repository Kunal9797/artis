"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.Transaction = exports.Product = void 0;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Product_1 = __importDefault(require("./Product"));
exports.Product = Product_1.default;
const Transaction_1 = __importDefault(require("./Transaction"));
exports.Transaction = Transaction_1.default;
const Product_2 = require("./Product");
(0, Product_2.initializeAssociations)();
