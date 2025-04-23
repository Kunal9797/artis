"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAssociations = void 0;
const Product_1 = __importDefault(require("./Product"));
const Transaction_1 = __importDefault(require("./Transaction"));
const index_1 = require("./index");
const initializeAssociations = () => {
    Product_1.default.hasMany(Transaction_1.default, {
        foreignKey: 'productId',
        as: 'transactions',
        onDelete: 'CASCADE'
    });
    Transaction_1.default.belongsTo(Product_1.default, {
        foreignKey: 'productId',
        onDelete: 'CASCADE'
    });
    // Lead associations
    index_1.Lead.belongsTo(index_1.SalesTeam, {
        as: 'assignee',
        foreignKey: 'assignedTo'
    });
    index_1.Lead.belongsTo(index_1.User, {
        as: 'assigner',
        foreignKey: 'assignedBy'
    });
    index_1.SalesTeam.hasMany(index_1.Lead, {
        as: 'assignedLeads',
        foreignKey: 'assignedTo'
    });
};
exports.initializeAssociations = initializeAssociations;
