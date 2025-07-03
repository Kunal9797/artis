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
var Product = /** @class */ (function (_super) {
    __extends(Product, _super);
    function Product() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Product;
}(sequelize_1.Model));
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
