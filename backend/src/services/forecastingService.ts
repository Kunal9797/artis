import { Op } from 'sequelize';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import ConsumptionForecast from '../models/ConsumptionForecast';
import sequelize from '../config/sequelize';

interface ForecastResult {
  productId: string;
  forecastMonth: string;
  predictedConsumption: number;
  confidence: number;
  method: string;
  seasonalFactor?: number;
  trendFactor?: number;
}

interface StockoutRisk {
  productId: string;
  artisCodes: string[];
  name?: string;
  supplier: string;
  currentStock: number;
  avgConsumption: number;
  daysUntilStockout: number | null;
  leadTimeDays: number;
  riskLevel: 'STOCKOUT' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  recommendedOrderQty: number;
  recommendedOrderDate: Date;
  estimatedStockoutDate: Date | null;
}

export class ForecastingService {
  /**
   * Calculate moving average forecast
   */
  private async calculateMovingAverage(
    productId: string,
    periods: number = 3
  ): Promise<number> {
    const recentTransactions = await Transaction.findAll({
      where: {
        productId,
        type: 'OUT',
        includeInAvg: true,
        date: {
          [Op.gte]: new Date(Date.now() - periods * 30 * 24 * 60 * 60 * 1000)
        }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'DESC']],
      limit: periods
    });

    if (recentTransactions.length === 0) {
      return 0;
    }

    const total = recentTransactions.reduce((sum, t: any) => sum + parseFloat(t.dataValues.total), 0);
    return total / recentTransactions.length;
  }

  /**
   * Detect seasonal patterns
   */
  private async detectSeasonalPattern(productId: string): Promise<number[]> {
    const yearData = await Transaction.findAll({
      where: {
        productId,
        type: 'OUT',
        includeInAvg: true,
        date: {
          [Op.gte]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        }
      },
      attributes: [
        [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date')), 'month'],
        [sequelize.fn('AVG', sequelize.col('quantity')), 'avg_quantity']
      ],
      group: [sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date'))],
      order: [[sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM date')), 'ASC']]
    });

    const monthlyFactors = new Array(12).fill(1.0);
    if (yearData.length >= 6) {
      const yearAvg = yearData.reduce((sum, d: any) => sum + parseFloat(d.dataValues.avg_quantity), 0) / yearData.length;

      yearData.forEach((d: any) => {
        const month = parseInt(d.dataValues.month) - 1;
        monthlyFactors[month] = parseFloat(d.dataValues.avg_quantity) / yearAvg;
      });
    }

    return monthlyFactors;
  }

  /**
   * Calculate trend using linear regression
   */
  private async calculateTrend(productId: string): Promise<number> {
    const historicalData = await Transaction.findAll({
      where: {
        productId,
        type: 'OUT',
        includeInAvg: true
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('date')), 'ASC']]
    });

    if (historicalData.length < 3) {
      return 0;
    }

    // Simple linear regression
    const n = historicalData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    historicalData.forEach((d: any, i: number) => {
      sumX += i;
      sumY += parseFloat(d.dataValues.total);
      sumXY += i * parseFloat(d.dataValues.total);
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope; // Monthly trend
  }

  /**
   * Generate forecast for a product
   */
  async generateForecast(
    productId: string,
    months: number = 3,
    userId?: string
  ): Promise<ForecastResult[]> {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const forecasts: ForecastResult[] = [];
    const movingAvg = await this.calculateMovingAverage(productId);
    const seasonalFactors = await this.detectSeasonalPattern(productId);
    const trend = await this.calculateTrend(productId);

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const monthIndex = forecastDate.getMonth();
      const forecastMonth = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;

      // Calculate base forecast
      let forecast = movingAvg;

      // Apply trend
      if (Math.abs(trend) > 0.01) {
        forecast += trend * i;
      }

      // Apply seasonal factor
      const seasonalFactor = seasonalFactors[monthIndex];
      forecast *= seasonalFactor;

      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(product.avgConsumption, movingAvg, trend);

      forecasts.push({
        productId,
        forecastMonth,
        predictedConsumption: Math.max(0, forecast),
        confidence,
        method: 'seasonal_trend',
        seasonalFactor,
        trendFactor: trend
      });

      // Save to database
      await ConsumptionForecast.upsert({
        productId,
        forecastMonth,
        forecastDate: new Date(),
        predictedConsumption: Math.max(0, forecast),
        forecastMethod: 'seasonal_trend',
        confidence,
        seasonalFactor,
        trendFactor: trend,
        isBaseline: true,
        createdBy: userId
      });
    }

    return forecasts;
  }

  /**
   * Calculate forecast confidence
   */
  private calculateConfidence(avgConsumption: number, movingAvg: number, trend: number): number {
    let confidence = 50; // Base confidence

    // More data points increase confidence
    if (avgConsumption > 0) {
      confidence += 20;
    }

    // Stable consumption increases confidence
    if (avgConsumption > 0 && Math.abs(avgConsumption - movingAvg) / avgConsumption < 0.2) {
      confidence += 20;
    }

    // Low trend volatility increases confidence
    if (Math.abs(trend) < 0.1) {
      confidence += 10;
    }

    return Math.min(100, confidence);
  }

  /**
   * Calculate stockout risks for all products
   */
  async calculateStockoutRisks(): Promise<StockoutRisk[]> {
    const products = await Product.findAll({
      where: { deletedAt: null },
      include: [
        {
          model: Transaction,
          as: 'transactions',
          where: {
            type: 'OUT',
            date: {
              [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            }
          },
          required: false
        }
      ]
    });

    const risks: StockoutRisk[] = [];

    for (const product of products) {
      const dailyConsumption = product.avgConsumption / 30;
      const leadTime = product.leadTimeDays || 10;
      const safetyStockDays = product.safetyStockDays || 15;

      // Calculate days until stockout
      let daysUntilStockout: number | null = null;
      let estimatedStockoutDate: Date | null = null;

      if (dailyConsumption > 0) {
        daysUntilStockout = Math.floor(product.currentStock / dailyConsumption);
        estimatedStockoutDate = new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000);
      }

      // Calculate reorder point if not set
      const reorderPoint = product.reorderPoint || (dailyConsumption * (leadTime + safetyStockDays));

      // Determine risk level
      let riskLevel: StockoutRisk['riskLevel'];
      if (product.currentStock <= 0) {
        riskLevel = 'STOCKOUT';
      } else if (product.currentStock <= reorderPoint) {
        riskLevel = 'CRITICAL';
      } else if (daysUntilStockout !== null && daysUntilStockout <= leadTime) {
        riskLevel = 'HIGH';
      } else if (daysUntilStockout !== null && daysUntilStockout <= leadTime + safetyStockDays) {
        riskLevel = 'MEDIUM';
      } else if (product.currentStock <= reorderPoint * 1.5) {
        riskLevel = 'LOW';
      } else {
        riskLevel = 'SAFE';
      }

      // Calculate recommended order quantity
      const recommendedOrderQty = product.orderQuantity || (product.avgConsumption * 2); // 2 months supply

      // Calculate recommended order date
      const recommendedOrderDate = new Date();
      if (daysUntilStockout !== null && daysUntilStockout > leadTime) {
        recommendedOrderDate.setDate(recommendedOrderDate.getDate() + (daysUntilStockout - leadTime));
      }

      risks.push({
        productId: product.id,
        artisCodes: product.artisCodes,
        name: product.name,
        supplier: product.supplier,
        currentStock: product.currentStock,
        avgConsumption: product.avgConsumption,
        daysUntilStockout,
        leadTimeDays: leadTime,
        riskLevel,
        recommendedOrderQty,
        recommendedOrderDate,
        estimatedStockoutDate
      });
    }

    // Sort by risk level
    const riskOrder = ['STOCKOUT', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'];
    risks.sort((a, b) => riskOrder.indexOf(a.riskLevel) - riskOrder.indexOf(b.riskLevel));

    return risks;
  }

  /**
   * Update reorder points for all products
   */
  async updateReorderPoints(): Promise<void> {
    const products = await Product.findAll({
      where: { deletedAt: null }
    });

    for (const product of products) {
      const dailyConsumption = product.avgConsumption / 30;
      const leadTime = product.leadTimeDays || 10;
      const safetyStockDays = product.safetyStockDays || 15;

      const reorderPoint = dailyConsumption * (leadTime + safetyStockDays);

      await product.update({
        reorderPoint: Math.max(0, reorderPoint)
      });
    }
  }

  /**
   * Get procurement alerts
   */
  async getProcurementAlerts(): Promise<{
    critical: StockoutRisk[];
    upcoming: StockoutRisk[];
    overstock: any[];
  }> {
    const risks = await this.calculateStockoutRisks();

    // Critical items needing immediate attention
    const critical = risks.filter(r =>
      r.riskLevel === 'STOCKOUT' || r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH'
    );

    // Items that will need ordering soon
    const upcoming = risks.filter(r => r.riskLevel === 'MEDIUM');

    // Check for overstock situations
    const overstock = await Product.findAll({
      where: {
        deletedAt: null,
        currentStock: {
          [Op.gt]: sequelize.literal('"avgConsumption" * 6') // More than 6 months stock
        }
      },
      attributes: ['id', 'artisCodes', 'name', 'supplier', 'currentStock', 'avgConsumption']
    });

    return {
      critical,
      upcoming,
      overstock: overstock.map(p => ({
        ...p.toJSON(),
        monthsOfStock: p.avgConsumption > 0 ? (p.currentStock / p.avgConsumption).toFixed(1) : null
      }))
    };
  }
}

export default new ForecastingService();