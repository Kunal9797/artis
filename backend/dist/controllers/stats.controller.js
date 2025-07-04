"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryStats = exports.getSupplierStats = exports.getDashboardStats = void 0;
const sequelize_1 = __importDefault(require("../config/sequelize"));
const sequelize_2 = require("sequelize");
// Get dashboard statistics using database views
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { thickness, supplier, category, timeRange } = req.query;
        // Build WHERE conditions
        const conditions = [];
        const replacements = {};
        if (thickness && thickness !== 'all') {
            conditions.push('thickness = :thickness');
            replacements.thickness = thickness;
        }
        if (supplier && supplier !== 'all') {
            conditions.push('supplier = :supplier');
            replacements.supplier = supplier;
        }
        if (category && category !== 'all') {
            conditions.push('category = :category');
            replacements.category = category;
        }
        let dateCondition = '';
        if (timeRange === 'recent') {
            dateCondition = "AND month_sort >= TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYY-MM')";
        }
        else if (timeRange === 'year') {
            dateCondition = "AND month_sort >= TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YYYY-MM')";
        }
        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        // Get monthly stats from view
        const monthlyStats = yield sequelize_1.default.query(`
      SELECT 
        month_display as month,
        SUM(consumption) as consumption,
        SUM(purchases) as purchases
      FROM monthly_stats
      ${whereClause}
      ${dateCondition}
      GROUP BY month_sort, month_display
      ORDER BY month_sort
    `, {
            replacements,
            type: sequelize_2.QueryTypes.SELECT
        });
        // Get summary stats
        const summaryStats = yield sequelize_1.default.query(`
      SELECT * FROM product_summary
    `, { type: sequelize_2.QueryTypes.SELECT });
        // Get recent averages based on period
        const period = req.query.period === '4m' ? '4m' : '3m';
        const recentAvg = yield sequelize_1.default.query(`
      SELECT * FROM recent_averages_${period}
    `, { type: sequelize_2.QueryTypes.SELECT });
        res.json({
            monthly: monthlyStats,
            summary: summaryStats[0] || {},
            recentAverages: recentAvg[0] || {},
            success: true
        });
    }
    catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getDashboardStats = getDashboardStats;
// Get supplier statistics from view
const getSupplierStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield sequelize_1.default.query(`
      SELECT * FROM supplier_stats
      ORDER BY total_consumption DESC
    `, { type: sequelize_2.QueryTypes.SELECT });
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching supplier stats:', error);
        res.status(500).json({ error: 'Failed to fetch supplier statistics' });
    }
});
exports.getSupplierStats = getSupplierStats;
// Get category statistics from view
const getCategoryStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield sequelize_1.default.query(`
      SELECT * FROM category_stats
      ORDER BY total_consumption DESC
    `, { type: sequelize_2.QueryTypes.SELECT });
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({ error: 'Failed to fetch category statistics' });
    }
});
exports.getCategoryStats = getCategoryStats;
