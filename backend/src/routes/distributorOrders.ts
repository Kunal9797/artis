import express from 'express';
import { auth } from '../middleware/auth';
import {
  getDistributorOrders,
  getDistributorOrder,
  createDistributorOrder,
  updateDistributorOrder,
  deleteDistributorOrder,
  importDistributorOrders,
  getOrderAnalytics,
  getOrderTrends,
  getThicknessAnalysis,
  getLocationAnalysis,
  getTopDistributors,
  getDistributorRankings,
  getABCAnalysis,
  getGrowthMetrics
} from '../controllers/distributorOrderController';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Analytics routes (must be before /:id to avoid conflicts)
router.get('/analytics/summary', getOrderAnalytics);
router.get('/analytics/trends', getOrderTrends);
router.get('/analytics/by-thickness', getThicknessAnalysis);
router.get('/analytics/by-location', getLocationAnalysis);
router.get('/analytics/top-distributors', getTopDistributors);
router.get('/analytics/rankings', getDistributorRankings);
router.get('/analytics/abc-analysis', getABCAnalysis);
router.get('/analytics/growth-metrics', getGrowthMetrics);

// CRUD operations
router.get('/', getDistributorOrders);
router.get('/:id', getDistributorOrder);
router.post('/', createDistributorOrder);
router.put('/:id', updateDistributorOrder);
router.delete('/:id', deleteDistributorOrder);
router.post('/import', importDistributorOrders);

export default router;