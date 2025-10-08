import express from 'express';
import { procurementController } from '../controllers/procurementController';
import { auth } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Stockout risk analysis
router.get('/stockout-risks', procurementController.getStockoutRisks);

// Procurement alerts
router.get('/alerts', procurementController.getProcurementAlerts);

// Forecasting
router.post('/forecast', procurementController.generateForecast);
router.post('/forecast-all', procurementController.generateAllForecasts);

// Procurement settings
router.put('/products/:productId/settings', procurementController.updateProcurementSettings);

// Purchase orders
router.get('/purchase-orders', procurementController.getPurchaseOrders);
router.post('/purchase-orders', procurementController.createPurchaseOrder);
router.put('/purchase-orders/:orderId/status', procurementController.updatePurchaseOrderStatus);

// Supplier performance
router.get('/supplier-performance', procurementController.getSupplierPerformance);

// Reorder points
router.post('/update-reorder-points', procurementController.updateReorderPoints);

export default router;