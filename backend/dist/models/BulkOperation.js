"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../config/sequelize"));
class BulkOperation extends sequelize_1.Model {
}
BulkOperation.init({
    id: {
        type: sequelize_1.DataTypes.STRING,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('inventory', 'consumption', 'purchase', 'correction'),
        allowNull: false
    },
    uploadedBy: {
        type: sequelize_1.DataTypes.UUID,
        references: {
            model: 'Users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    uploadedAt: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW
    },
    fileName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false
    },
    monthStart: {
        type: sequelize_1.DataTypes.DATE
    },
    monthEnd: {
        type: sequelize_1.DataTypes.DATE
    },
    recordsTotal: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0
    },
    recordsProcessed: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0
    },
    recordsFailed: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'partial'),
        defaultValue: 'pending'
    },
    errorLog: {
        type: sequelize_1.DataTypes.TEXT
    },
    metadata: {
        type: sequelize_1.DataTypes.JSONB,
        defaultValue: {}
    }
}, {
    sequelize: sequelize_2.default,
    modelName: 'BulkOperation',
    tableName: 'BulkOperations',
    timestamps: true
});
exports.default = BulkOperation;
