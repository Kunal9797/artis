"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var sequelize_1 = require("sequelize");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var sequelize;
if (process.env.NODE_ENV === 'production') {
    // Production: Use DATABASE_URL
    sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL || '', {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        define: {
            timestamps: true,
            underscored: false
        }
    });
}
else {
    // Development: Use individual connection parameters
    sequelize = new sequelize_1.Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'artis_db',
        logging: false,
        define: {
            timestamps: true,
            underscored: false
        }
    });
}
exports.default = sequelize;
