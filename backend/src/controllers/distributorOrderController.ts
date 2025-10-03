import { Request, Response } from 'express';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import DistributorOrder from '../models/DistributorOrder';
import sequelize from '../config/sequelize';

// Get all distributor orders with filters
export const getDistributorOrders = async (req: Request, res: Response) => {
  try {
    const {
      distributor_name,
      location,
      state,
      start_date,
      end_date,
      thickness_type,
      page = 1,
      limit = 50,
      sort_by = 'order_date',
      sort_order = 'DESC'
    } = req.query;

    const whereClause: any = {};

    if (distributor_name) {
      whereClause.distributor_name = { [Op.iLike]: `%${distributor_name}%` };
    }

    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }

    if (state) {
      whereClause.state = { [Op.iLike]: `%${state}%` };
    }

    if (start_date && end_date) {
      whereClause.order_date = {
        [Op.between]: [new Date(start_date as string), new Date(end_date as string)]
      };
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await DistributorOrder.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [[sort_by as string, sort_order as string]]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        pages: Math.ceil(count / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching distributor orders:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch distributor orders' });
  }
};

// Get single distributor order
export const getDistributorOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await DistributorOrder.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching distributor order:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch distributor order' });
  }
};

// Create new distributor order
export const createDistributorOrder = async (req: Request, res: Response) => {
  try {
    const orderData = req.body;

    // Calculate total_pieces if not provided
    if (!orderData.total_pieces) {
      orderData.total_pieces = (orderData.thickness_72_92 || 0) +
                               (orderData.thickness_08 || 0) +
                               (orderData.thickness_1mm || 0);
    }

    const order = await DistributorOrder.create(orderData);

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('Error creating distributor order:', error);
    res.status(500).json({ success: false, error: 'Failed to create distributor order' });
  }
};

// Update distributor order
export const updateDistributorOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const order = await DistributorOrder.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Recalculate total_pieces if thickness values are being updated
    if (updateData.thickness_72_92 !== undefined ||
        updateData.thickness_08 !== undefined ||
        updateData.thickness_1mm !== undefined) {
      updateData.total_pieces = (updateData.thickness_72_92 || order.thickness_72_92 || 0) +
                                (updateData.thickness_08 || order.thickness_08 || 0) +
                                (updateData.thickness_1mm || order.thickness_1mm || 0);
    }

    await order.update(updateData);

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error updating distributor order:', error);
    res.status(500).json({ success: false, error: 'Failed to update distributor order' });
  }
};

// Delete distributor order
export const deleteDistributorOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await DistributorOrder.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await order.destroy();

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting distributor order:', error);
    res.status(500).json({ success: false, error: 'Failed to delete distributor order' });
  }
};

// Import multiple distributor orders
export const importDistributorOrders = async (req: Request, res: Response) => {
  try {
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid orders data' });
    }

    // Process each order
    const processedOrders = orders.map(order => {
      // Parse date if it's in DD.MM.YYYY format
      if (order.order_date && order.order_date.includes('.')) {
        const [day, month, year] = order.order_date.split('.');
        order.order_date = new Date(`${year}-${month}-${day}`);
      }

      // Calculate total_pieces
      order.total_pieces = (order.thickness_72_92 || 0) +
                          (order.thickness_08 || 0) +
                          (order.thickness_1mm || 0);

      // Calculate month_year and quarter
      if (order.order_date) {
        order.month_year = DistributorOrder.calculateMonthYear(new Date(order.order_date));
        order.quarter = DistributorOrder.calculateQuarter(new Date(order.order_date));
      }

      // Derive state from location
      if (order.location && !order.state) {
        order.state = DistributorOrder.deriveState(order.location);
      }

      return order;
    });

    const createdOrders = await DistributorOrder.bulkCreate(processedOrders);

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdOrders.length} orders`,
      data: createdOrders
    });
  } catch (error) {
    console.error('Error importing distributor orders:', error);
    res.status(500).json({ success: false, error: 'Failed to import distributor orders' });
  }
};

// Get order analytics summary
export const getOrderAnalytics = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let whereClause: any = {};
    if (start_date && end_date) {
      whereClause.order_date = {
        [Op.between]: [new Date(start_date as string), new Date(end_date as string)]
      };
    }

    // Get current month stats
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const [totalStats, monthStats, distributorCount] = await Promise.all([
      // Total stats
      DistributorOrder.findOne({
        where: whereClause,
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_orders'],
          [Sequelize.fn('SUM', Sequelize.col('total_pieces')), 'total_volume'],
          [Sequelize.fn('AVG', Sequelize.col('total_pieces')), 'avg_order_size']
        ],
        raw: true
      }),

      // Current month stats
      DistributorOrder.findOne({
        where: {
          order_date: { [Op.between]: [firstDayOfMonth, lastDayOfMonth] }
        },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders_this_month'],
          [Sequelize.fn('SUM', Sequelize.col('total_pieces')), 'volume_this_month']
        ],
        raw: true
      }),

      // Active distributors count
      DistributorOrder.count({
        where: whereClause,
        distinct: true,
        col: 'distributor_name'
      })
    ]);

    res.json({
      success: true,
      data: {
        ...totalStats,
        ...monthStats,
        active_distributors: distributorCount
      }
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order analytics' });
  }
};

// Get order trends over time
export const getOrderTrends = async (req: Request, res: Response) => {
  try {
    const { period = 'monthly', start_date, end_date } = req.query;

    let whereClause: any = {};
    if (start_date && end_date) {
      whereClause.order_date = {
        [Op.between]: [new Date(start_date as string), new Date(end_date as string)]
      };
    }

    let groupBy, dateFormat;
    if (period === 'daily') {
      groupBy = 'order_date';
      dateFormat = 'order_date';
    } else if (period === 'quarterly') {
      groupBy = 'quarter';
      dateFormat = 'quarter';
    } else { // monthly
      groupBy = 'month_year';
      dateFormat = 'month_year';
    }

    const trends = await sequelize.query(`
      SELECT
        ${dateFormat} as period,
        COUNT(*) as total_orders,
        SUM(total_pieces) as total_volume,
        SUM(thickness_72_92) as thickness_72_92_total,
        SUM(thickness_08) as thickness_08_total,
        SUM(thickness_1mm) as thickness_1mm_total,
        AVG(total_pieces) as avg_order_size,
        COUNT(DISTINCT distributor_name) as unique_distributors
      FROM distributor_orders
      ${whereClause.order_date ? `WHERE order_date BETWEEN '${whereClause.order_date[Op.between][0].toISOString()}' AND '${whereClause.order_date[Op.between][1].toISOString()}'` : ''}
      GROUP BY ${groupBy}
      ORDER BY MIN(order_date) DESC
      LIMIT 12
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Error fetching order trends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order trends' });
  }
};

// Get thickness analysis
export const getThicknessAnalysis = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, distributor_name, location } = req.query;

    let whereClause: any = {};
    if (start_date && end_date) {
      whereClause.order_date = {
        [Op.between]: [new Date(start_date as string), new Date(end_date as string)]
      };
    }
    if (distributor_name) {
      whereClause.distributor_name = { [Op.iLike]: `%${distributor_name}%` };
    }
    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }

    const analysis: any = await DistributorOrder.findOne({
      where: whereClause,
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('thickness_72_92')), 'thickness_72_92_total'],
        [Sequelize.fn('SUM', Sequelize.col('thickness_08')), 'thickness_08_total'],
        [Sequelize.fn('SUM', Sequelize.col('thickness_1mm')), 'thickness_1mm_total'],
        [Sequelize.fn('SUM', Sequelize.col('total_pieces')), 'total_pieces']
      ],
      raw: true
    });

    // Calculate percentages
    const total = Number(analysis?.total_pieces) || 0;
    const result = {
      thickness_72_92: {
        quantity: Number(analysis?.thickness_72_92_total) || 0,
        percentage: total > 0 ? ((Number(analysis?.thickness_72_92_total) || 0) / total * 100).toFixed(2) : 0
      },
      thickness_08: {
        quantity: Number(analysis?.thickness_08_total) || 0,
        percentage: total > 0 ? ((Number(analysis?.thickness_08_total) || 0) / total * 100).toFixed(2) : 0
      },
      thickness_1mm: {
        quantity: Number(analysis?.thickness_1mm_total) || 0,
        percentage: total > 0 ? ((Number(analysis?.thickness_1mm_total) || 0) / total * 100).toFixed(2) : 0
      },
      total: total
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching thickness analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch thickness analysis' });
  }
};

// Get location analysis
export const getLocationAnalysis = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, group_by = 'location' } = req.query;

    let whereClause: any = {};
    if (start_date && end_date) {
      whereClause.order_date = {
        [Op.between]: [new Date(start_date as string), new Date(end_date as string)]
      };
    }

    const groupByColumn = group_by === 'state' ? 'state' : 'location';

    const analysis = await DistributorOrder.findAll({
      where: whereClause,
      attributes: [
        groupByColumn,
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_orders'],
        [Sequelize.fn('SUM', Sequelize.col('total_pieces')), 'total_volume'],
        [Sequelize.fn('AVG', Sequelize.col('total_pieces')), 'avg_order_size'],
        [Sequelize.fn('COUNT', Sequelize.literal('DISTINCT distributor_name')), 'distributor_count']
      ],
      group: [groupByColumn],
      order: [[Sequelize.col('total_volume'), 'DESC']],
      raw: true
    });

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Error fetching location analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch location analysis' });
  }
};

// Get top distributors
export const getTopDistributors = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;

    let whereClause: any = {};
    if (start_date && end_date) {
      whereClause.order_date = {
        [Op.between]: [new Date(start_date as string), new Date(end_date as string)]
      };
    }

    const topDistributors = await DistributorOrder.findAll({
      where: whereClause,
      attributes: [
        'distributor_name',
        'location',
        'state',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_orders'],
        [Sequelize.fn('SUM', Sequelize.col('total_pieces')), 'total_volume'],
        [Sequelize.fn('AVG', Sequelize.col('total_pieces')), 'avg_order_size'],
        [Sequelize.fn('MAX', Sequelize.col('order_date')), 'last_order_date'],
        [Sequelize.fn('MIN', Sequelize.col('order_date')), 'first_order_date']
      ],
      group: ['distributor_name', 'location', 'state'],
      order: [[Sequelize.col('total_volume'), 'DESC']],
      limit: Number(limit),
      raw: true
    });

    res.json({ success: true, data: topDistributors });
  } catch (error) {
    console.error('Error fetching top distributors:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top distributors' });
  }
};

// Get distributor rankings with multiple metrics
export const getDistributorRankings = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, metric = 'volume' } = req.query;

    let whereClause = '';
    if (start_date && end_date) {
      whereClause = `WHERE order_date BETWEEN '${start_date}' AND '${end_date}'`;
    }

    // Simplified query for better compatibility
    const rankings = await sequelize.query(`
      SELECT
        distributor_name,
        location,
        state,
        COUNT(*) as total_orders,
        SUM(total_pieces) as total_volume,
        AVG(total_pieces)::numeric as avg_order_size,
        COUNT(DISTINCT DATE_TRUNC('month', order_date)) as months_active,
        MIN(order_date) as first_order_date,
        MAX(order_date) as last_order_date,
        SUM(thickness_08) as thickness_08_total,
        SUM(thickness_1mm) as thickness_1mm_total,
        SUM(thickness_72_92) as thickness_72_92_total,
        CASE
          WHEN SUM(total_pieces) >= 50000 THEN 'Platinum'
          WHEN SUM(total_pieces) >= 25000 THEN 'Gold'
          WHEN SUM(total_pieces) >= 10000 THEN 'Silver'
          ELSE 'Bronze'
        END as tier_classification
      FROM distributor_orders
      ${whereClause}
      GROUP BY distributor_name, location, state
      ORDER BY
        CASE
          WHEN '${metric}' = 'volume' THEN SUM(total_pieces)
          WHEN '${metric}' = 'orders' THEN COUNT(*)
          ELSE SUM(total_pieces)
        END DESC
      LIMIT 50
    `, { type: QueryTypes.SELECT });

    // Add rankings
    const rankedData = rankings.map((row: any, index: number) => ({
      ...row,
      total_orders: parseInt(row.total_orders),
      total_volume: parseInt(row.total_volume),
      avg_order_size: parseFloat(row.avg_order_size),
      months_active: parseInt(row.months_active),
      volume_rank: index + 1,
      frequency_rank: index + 1,
      avg_size_rank: index + 1,
      growth_rank: index + 1,
      growth_percentage: 0,
      orders_per_month: row.months_active > 0 ? (parseInt(row.total_orders) / parseInt(row.months_active)).toFixed(2) : 0,
      last_month_volume: 0,
      prev_month_volume: 0
    }));

    res.json({ success: true, data: rankedData });
  } catch (error) {
    console.error('Error fetching distributor rankings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch distributor rankings' });
  }
};

// Get ABC analysis for distributors
export const getABCAnalysis = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = '';
    if (start_date && end_date) {
      whereClause = `WHERE order_date BETWEEN '${start_date}' AND '${end_date}'`;
    }

    // Get distributor totals first
    const distributorTotals = await sequelize.query(`
      SELECT
        distributor_name,
        location,
        state,
        SUM(total_pieces) as total_volume,
        COUNT(*) as total_orders,
        AVG(total_pieces) as avg_order_size,
        MAX(order_date) as last_order_date
      FROM distributor_orders
      ${whereClause}
      GROUP BY distributor_name, location, state
      ORDER BY SUM(total_pieces) DESC
    `, { type: QueryTypes.SELECT });

    // Calculate ABC categories in JavaScript
    let cumulativeVolume = 0;
    const grandTotal = distributorTotals.reduce((sum: number, d: any) => sum + parseInt(d.total_volume), 0);

    const analysis = distributorTotals.map((dist: any) => {
      const volume = parseInt(dist.total_volume);
      cumulativeVolume += volume;
      const volumePercentage = (volume * 100 / grandTotal).toFixed(2);
      const cumulativePercentage = (cumulativeVolume * 100 / grandTotal).toFixed(2);

      let abc_category = 'C';
      if ((cumulativeVolume - volume) * 100 / grandTotal < 80) {
        abc_category = 'A';
      } else if ((cumulativeVolume - volume) * 100 / grandTotal < 95) {
        abc_category = 'B';
      }

      return {
        ...dist,
        total_volume: volume,
        total_orders: parseInt(dist.total_orders),
        avg_order_size: parseFloat(dist.avg_order_size),
        volume_percentage: volumePercentage,
        cumulative_percentage: cumulativePercentage,
        abc_category
      };
    });

    // Calculate summary
    const summary = [
      { abc_category: 'A', distributor_count: 0, category_volume: 0, volume_percentage: 0 },
      { abc_category: 'B', distributor_count: 0, category_volume: 0, volume_percentage: 0 },
      { abc_category: 'C', distributor_count: 0, category_volume: 0, volume_percentage: 0 }
    ];

    analysis.forEach((dist: any) => {
      const catIndex = dist.abc_category === 'A' ? 0 : dist.abc_category === 'B' ? 1 : 2;
      summary[catIndex].distributor_count++;
      summary[catIndex].category_volume += dist.total_volume;
    });

    summary.forEach(cat => {
      cat.volume_percentage = grandTotal > 0 ? parseFloat((cat.category_volume * 100 / grandTotal).toFixed(2)) : 0;
    });

    res.json({
      success: true,
      data: {
        distributors: analysis,
        summary: summary
      }
    });
  } catch (error) {
    console.error('Error fetching ABC analysis:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch ABC analysis' });
  }
};

// Get growth metrics for distributors
export const getGrowthMetrics = async (req: Request, res: Response) => {
  try {
    const { period = 'monthly', limit = 10 } = req.query;

    const growthData = await sequelize.query(`
      WITH period_data AS (
        SELECT
          distributor_name,
          DATE_TRUNC('${period === 'quarterly' ? 'quarter' : 'month'}', order_date) as period,
          SUM(total_pieces) as period_volume,
          COUNT(*) as period_orders
        FROM distributor_orders
        GROUP BY distributor_name, DATE_TRUNC('${period === 'quarterly' ? 'quarter' : 'month'}', order_date)
      ),
      growth_calc AS (
        SELECT
          distributor_name,
          period,
          period_volume,
          period_orders,
          LAG(period_volume) OVER (PARTITION BY distributor_name ORDER BY period) as prev_volume,
          LAG(period_orders) OVER (PARTITION BY distributor_name ORDER BY period) as prev_orders
        FROM period_data
      )
      SELECT
        distributor_name,
        period,
        period_volume,
        period_orders,
        prev_volume,
        prev_orders,
        CASE
          WHEN prev_volume > 0
          THEN ROUND(((period_volume - prev_volume) * 100.0 / prev_volume), 2)
          ELSE NULL
        END as volume_growth_percentage,
        CASE
          WHEN prev_orders > 0
          THEN ROUND(((period_orders - prev_orders) * 100.0 / prev_orders), 2)
          ELSE NULL
        END as order_growth_percentage
      FROM growth_calc
      WHERE prev_volume IS NOT NULL
      ORDER BY period DESC, volume_growth_percentage DESC NULLS LAST
      LIMIT ${Number(limit)}
    `, { type: QueryTypes.SELECT });

    res.json({ success: true, data: growthData });
  } catch (error) {
    console.error('Error fetching growth metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch growth metrics' });
  }
};