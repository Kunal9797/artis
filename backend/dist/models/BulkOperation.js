"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var sequelize_1 = require("sequelize");
var sequelize_2 = require("../config/sequelize");
var BulkOperation = /** @class */ (function (_super) {
    __extends(BulkOperation, _super);
    function BulkOperation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return BulkOperation;
}(sequelize_1.Model));
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
