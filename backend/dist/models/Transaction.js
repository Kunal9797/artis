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
var Transaction = /** @class */ (function (_super) {
    __extends(Transaction, _super);
    function Transaction() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Transaction;
}(sequelize_1.Model));
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
        type: sequelize_1.DataTypes.ENUM('IN', 'OUT', 'CORRECTION'),
        allowNull: false,
    },
    quantity: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        get: function () {
            var value = this.getDataValue('quantity');
            return value ? Number(parseFloat(value).toFixed(2)) : 0;
        },
        set: function (value) {
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
    },
    operationId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize: sequelize_2.default,
    modelName: 'Transaction',
    tableName: 'Transactions',
    timestamps: true
});
exports.default = Transaction;
