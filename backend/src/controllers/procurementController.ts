import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import Product from '../models/Product';
import PurchaseOrder from '../models/PurchaseOrder';
import ConsumptionForecast from '../models/ConsumptionForecast';
import forecastingService from '../services/forecastingService';
import sequelize from '../config/sequelize';

export const procurementController = {
  /**
   * Get stockout risk analysis
   */
  async getStockoutRisks(req: Request, res: Response) {
    try {
      const risks = await forecastingService.calculateStockoutRisks();

      // Group by risk level
      const riskSummary = {
        stockout: risks.filter(r => r.riskLevel === 'STOCKOUT'),
        critical: risks.filter(r => r.riskLevel === 'CRITICAL'),
        high: risks.filter(r => r.riskLevel === 'HIGH'),
        medium: risks.filter(r => r.riskLevel === 'MEDIUM'),
        low: risks.filter(r => r.riskLevel === 'LOW'),
        safe: risks.filter(r => r.riskLevel === 'SAFE')
      };

      res.json({
        success: true,
        data: {
          risks,
          summary: {
            total: risks.length,
            stockout: riskSummary.stockout.length,
            critical: riskSummary.critical.length,
            high: riskSummary.high.length,
            medium: riskSummary.medium.length,
            low: riskSummary.low.length,
            safe: riskSummary.safe.length
          },
          riskGroups: riskSummary
        }
      });
    } catch (error) {
      console.error('Error calculating stockout risks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate stockout risks',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get procurement alerts
   */
  async getProcurementAlerts(req: Request, res: Response) {
    try {
      const alerts = await forecastingService.getProcurementAlerts();

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error getting procurement alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get procurement alerts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Generate consumption forecast
   */
  async generateForecast(req: Request, res: Response) {
    try {
      const { productId, months = 3 } = req.body;
      const userId = (req as any).user?.id;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      const forecast = await forecastingService.generateForecast(productId, months, userId);

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      console.error('Error generating forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate forecast',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Generate forecasts for all products
   */
  async generateAllForecasts(req: Request, res: Response) {
    try {
      const { months = 3 } = req.body;
      const userId = (req as any).user?.id;

      const products = await Product.findAll({
        where: { deletedAt: null },
        attributes: ['id']
      });

      const results = [];
      for (const product of products) {
        try {
          const forecast = await forecastingService.generateForecast(product.id, months, userId);
          results.push({ productId: product.id, success: true, forecast });
        } catch (error) {
          results.push({
            productId: product.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          total: products.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        }
      });
    } catch (error) {
      console.error('Error generating all forecasts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate forecasts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update product procurement settings
   */
  async updateProcurementSettings(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const {
        leadTimeDays,
        safetyStockDays,
        orderQuantity,
        isImported,
        minStockLevel
      } = req.body;

      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Update fields
      const updates: any = {};
      if (leadTimeDays !== undefined) updates.leadTimeDays = leadTimeDays;
      if (safetyStockDays !== undefined) updates.safetyStockDays = safetyStockDays;
      if (orderQuantity !== undefined) updates.orderQuantity = orderQuantity;
      if (isImported !== undefined) {
        updates.isImported = isImported;
        // Set default lead time for imported products
        if (isImported && !leadTimeDays) {
          updates.leadTimeDays = 60;
        }
      }
      if (minStockLevel !== undefined) updates.minStockLevel = minStockLevel;

      // Calculate reorder point
      const dailyConsumption = product.avgConsumption / 30;
      const leadTime = updates.leadTimeDays || product.leadTimeDays || 10;
      const safetyStock = updates.safetyStockDays || product.safetyStockDays || 15;
      updates.reorderPoint = dailyConsumption * (leadTime + safetyStock);

      await product.update(updates);

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Error updating procurement settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update procurement settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Create purchase order
   */
  async createPurchaseOrder(req: Request, res: Response) {
    try {
      const {
        productId,
        quantity,
        supplier,
        unitPrice,
        notes,
        expectedDeliveryDate
      } = req.body;

      const userId = (req as any).user?.id;

      // Validate product
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Generate order number
      const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Calculate expected delivery date if not provided
      const leadTimeDays = product.leadTimeDays || 10;
      const expectedDelivery = expectedDeliveryDate
        ? new Date(expectedDeliveryDate)
        : new Date(Date.now() + leadTimeDays * 24 * 60 * 60 * 1000);

      // Create purchase order
      const purchaseOrder = await PurchaseOrder.create({
        orderNumber,
        productId,
        supplier: supplier || product.supplier,
        quantity,
        unitPrice,
        totalAmount: unitPrice ? quantity * unitPrice : null,
        orderDate: new Date(),
        expectedDeliveryDate: expectedDelivery,
        leadTimeDays,
        status: 'pending',
        notes,
        createdBy: userId
      });

      // Update product's last order date
      await product.update({
        lastOrderDate: new Date()
      });

      res.json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create purchase order',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get purchase orders
   */
  async getPurchaseOrders(req: Request, res: Response) {
    try {
      const { status, supplier, productId, limit = 50, offset = 0 } = req.query;

      const where: any = {};
      if (status) where.status = status;
      if (supplier) where.supplier = supplier;
      if (productId) where.productId = productId;

      const purchaseOrders = await PurchaseOrder.findAndCountAll({
        where,
        include: [{
          model: Product,
          as: 'product',
          attributes: ['id', 'artisCodes', 'name', 'supplier', 'category']
        }],
        limit: Number(limit),
        offset: Number(offset),
        order: [['orderDate', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          orders: purchaseOrders.rows,
          total: purchaseOrders.count,
          limit: Number(limit),
          offset: Number(offset)
        }
      });
    } catch (error) {
      console.error('Error getting purchase orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get purchase orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update purchase order status
   */
  async updatePurchaseOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const { status, actualDeliveryDate, trackingNumber, invoiceNumber, notes } = req.body;

      const purchaseOrder = await PurchaseOrder.findByPk(orderId);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }

      const updates: any = {};
      if (status) updates.status = status;
      if (actualDeliveryDate) updates.actualDeliveryDate = new Date(actualDeliveryDate);
      if (trackingNumber) updates.trackingNumber = trackingNumber;
      if (invoiceNumber) updates.invoiceNumber = invoiceNumber;
      if (notes) updates.notes = notes;

      // If delivered, calculate actual lead time
      if (status === 'delivered' && actualDeliveryDate) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const actualLeadTime = Math.ceil(
          (new Date(actualDeliveryDate).getTime() - purchaseOrder.orderDate.getTime()) / msPerDay
        );
        updates.actualLeadTimeDays = actualLeadTime;
      }

      await purchaseOrder.update(updates);

      res.json({
        success: true,
        data: purchaseOrder
      });
    } catch (error) {
      console.error('Error updating purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update purchase order',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Get supplier performance metrics
   */
  async getSupplierPerformance(req: Request, res: Response) {
    try {
      const supplierPerformance = await sequelize.query(`
        SELECT * FROM supplier_performance
        ORDER BY total_orders DESC;
      `, { type: QueryTypes.SELECT });

      res.json({
        success: true,
        data: supplierPerformance
      });
    } catch (error) {
      console.error('Error getting supplier performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get supplier performance',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  /**
   * Update all reorder points
   */
  async updateReorderPoints(req: Request, res: Response) {
    try {
      await forecastingService.updateReorderPoints();

      res.json({
        success: true,
        message: 'Reorder points updated successfully'
      });
    } catch (error) {
      console.error('Error updating reorder points:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update reorder points',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};