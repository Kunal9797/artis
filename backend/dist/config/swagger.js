"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Artis Sales Team API',
            version: '1.0.0',
            description: 'API documentation for Artis Sales Team Management System',
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://artis-backend.onrender.com'
                    : 'http://localhost:8099',
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{
                bearerAuth: [],
            }],
    },
    apis: ['./src/routes/*.ts'], // Path to the API docs
};
const specs = (0, swagger_jsdoc_1.default)(options);
exports.default = specs;
