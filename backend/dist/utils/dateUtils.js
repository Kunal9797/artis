"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDateWhereClause = exports.getDateRange = void 0;
const sequelize_1 = require("sequelize");
const getDateRange = (query) => {
    // If explicit dates are provided, use them
    if (query.startDate && query.endDate) {
        return {
            startDate: new Date(query.startDate),
            endDate: new Date(query.endDate)
        };
    }
    // Otherwise calculate based on timeRange
    const endDate = new Date();
    const startDate = new Date();
    switch (query.timeRange) {
        case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(endDate.getMonth() - 3);
            break;
        default:
            startDate.setMonth(endDate.getMonth() - 1); // Default to month
    }
    return { startDate, endDate };
};
exports.getDateRange = getDateRange;
const createDateWhereClause = (dateRange, fieldName) => ({
    [fieldName]: {
        [sequelize_1.Op.between]: [dateRange.startDate, dateRange.endDate]
    }
});
exports.createDateWhereClause = createDateWhereClause;
