"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
class Transaction extends sequelize_1.Model {
}
Transaction.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    productId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Products',
            key: 'id'
        }
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('IN', 'OUT'),
        allowNull: false,
    },
    quantity: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        get() {
            const value = this.getDataValue('quantity');
            return value ? Number(parseFloat(value).toFixed(2)) : 0;
        },
        set(value) {
            this.setDataValue('quantity', Number(parseFloat(value.toString()).toFixed(2)));
        }
    },
    date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    notes: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    includeInAvg: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    sequelize: sequelize_2.default,
    modelName: 'Transaction',
    tableName: 'Transactions',
    timestamps: true
});
exports.default = Transaction;
