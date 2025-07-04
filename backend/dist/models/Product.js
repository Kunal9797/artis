"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
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
    sequelize: sequelize_2.default,
    modelName: 'Product',
    tableName: 'Products'
});
exports.default = Product;
