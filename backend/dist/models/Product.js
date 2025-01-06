"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAssociations = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const Transaction_1 = __importDefault(require("./Transaction"));
class Product extends sequelize_1.Model {
}
Product.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    artisCodes: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    supplier: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    category: sequelize_1.DataTypes.STRING,
    supplierCode: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    currentStock: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    avgConsumption: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    lastUpdated: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    minStockLevel: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    gsm: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    catalogs: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
        defaultValue: []
    },
    texture: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    },
    thickness: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize: database_1.default,
    modelName: 'Product',
    tableName: 'Products'
});
const initializeAssociations = () => {
    Product.hasMany(Transaction_1.default, {
        foreignKey: 'productId',
        as: 'transactions',
        onDelete: 'CASCADE'
    });
    Transaction_1.default.belongsTo(Product, {
        foreignKey: 'productId',
        onDelete: 'CASCADE'
    });
};
exports.initializeAssociations = initializeAssociations;
exports.default = Product;
