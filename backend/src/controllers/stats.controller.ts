import { Request, Response } from 'express';
import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';

// Get dashboard statistics using database views
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { thickness, supplier, category, timeRange } = req.query;
    
    // Build WHERE conditions
    const conditions = [];
    const replacements: any = {};
    
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
    } else if (timeRange === 'year') {
      dateCondition = "AND month_sort >= TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YYYY-MM')";
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // Get monthly stats from view
    const monthlyStats = await sequelize.query(`
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
      type: QueryTypes.SELECT
    });
    
    // Get summary stats
    const summaryStats = await sequelize.query(`
      SELECT * FROM product_summary
    `, { type: QueryTypes.SELECT });
    
    // Get recent averages based on period
    const period = req.query.period === '4m' ? '4m' : '3m';
    const recentAvg = await sequelize.query(`
      SELECT * FROM recent_averages_${period}
    `, { type: QueryTypes.SELECT });
    
    res.json({
      monthly: monthlyStats,
      summary: summaryStats[0] || {},
      recentAverages: recentAvg[0] || {},
      success: true
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get supplier statistics from view
export const getSupplierStats = async (req: Request, res: Response) => {
  try {
    const stats = await sequelize.query(`
      SELECT * FROM supplier_stats
      ORDER BY total_consumption DESC
    `, { type: QueryTypes.SELECT });
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    res.status(500).json({ error: 'Failed to fetch supplier statistics' });
  }
};

// Get category statistics from view
export const getCategoryStats = async (req: Request, res: Response) => {
  try {
    const stats = await sequelize.query(`
      SELECT * FROM category_stats
      ORDER BY total_consumption DESC
    `, { type: QueryTypes.SELECT });
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category statistics' });
  }
};