import { Router, Request, Response } from 'express';
import { SheetsManagerService } from '../services/sheets-manager.service';
import SheetsManagerOptimizedService from '../services/sheets-manager-optimized.service';
import { auth } from '../middleware/auth';

// Define AuthRequest interface to match the auth middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

const router = Router();
// Use optimized service for better performance with large datasets
const sheetsManager = new SheetsManagerOptimizedService();

/**
 * @swagger
 * /api/sheets/pending:
 *   get:
 *     summary: Get count of pending data in Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending data counts
 */
router.get('/pending', auth, async (req, res) => {
  try {
    const summary = await sheetsManager.getPendingSummary();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Error getting pending summary:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get pending data' 
    });
  }
});

/**
 * @swagger
 * /api/sheets/sync/consumption:
 *   post:
 *     summary: Sync consumption data from Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync/consumption', auth, async (req, res) => {
  try {
    const result = await sheetsManager.syncConsumption();
    
    // Clear sheet if successful and no errors
    if (result.added > 0 && result.errors.length === 0) {
      await sheetsManager.clearSheet('consumption');
    }
    
    res.json({ 
      success: true, 
      message: `Synced ${result.added} consumption records`,
      ...result 
    });
  } catch (error: any) {
    console.error('Error syncing consumption:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync consumption data' 
    });
  }
});

/**
 * @swagger
 * /api/sheets/sync/purchases:
 *   post:
 *     summary: Sync purchases data from Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync/purchases', auth, async (req, res) => {
  try {
    const result = await sheetsManager.syncPurchases();
    
    // Clear sheet if successful and no errors
    if (result.added > 0 && result.errors.length === 0) {
      await sheetsManager.clearSheet('purchases');
    }
    
    res.json({ 
      success: true, 
      message: `Synced ${result.added} purchase records`,
      ...result 
    });
  } catch (error: any) {
    console.error('Error syncing purchases:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync purchase data' 
    });
  }
});

/**
 * @swagger
 * /api/sheets/sync/initial-stock:
 *   post:
 *     summary: Sync initial stock data from Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync/initial-stock', auth, async (req, res) => {
  try {
    const result = await sheetsManager.syncInitialStock();
    
    // Clear sheet if successful and no errors
    if (result.added > 0 && result.errors.length === 0) {
      await sheetsManager.clearSheet('initialStock');
    }
    
    res.json({ 
      success: true, 
      message: `Set initial stock for ${result.added} products`,
      ...result 
    });
  } catch (error: any) {
    console.error('Error syncing initial stock:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync initial stock' 
    });
  }
});

/**
 * @swagger
 * /api/sheets/sync/corrections:
 *   post:
 *     summary: Sync corrections data from Google Sheets
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync results
 */
router.post('/sync/corrections', auth, async (req, res) => {
  try {
    const result = await sheetsManager.syncCorrections();
    
    // Clear sheet if successful and no errors
    if (result.added > 0 && result.errors.length === 0) {
      await sheetsManager.clearSheet('corrections');
    }
    
    res.json({ 
      success: true, 
      message: `Applied ${result.added} corrections`,
      ...result 
    });
  } catch (error: any) {
    console.error('Error syncing corrections:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync corrections' 
    });
  }
});

/**
 * @swagger
 * /api/sheets/archives/{type}:
 *   get:
 *     summary: Get list of archive tabs for a sheet type
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [consumption, purchases, corrections, initialStock]
 *     responses:
 *       200:
 *         description: List of archive tab names
 */
router.get('/archives/:type', auth, async (req, res) => {
  try {
    const { type } = req.params as { type: 'consumption' | 'purchases' | 'corrections' | 'initialStock' };
    const archives = await sheetsManager.getArchiveTabs(type);
    res.json({ success: true, data: archives });
  } catch (error: any) {
    console.error('Error getting archives:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get archives' 
    });
  }
});

/**
 * @swagger
 * /api/sheets/setup/{type}:
 *   post:
 *     summary: Setup Google Sheet with template
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [consumption, purchases, corrections]
 *     responses:
 *       200:
 *         description: Setup complete
 */
router.post('/setup/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    
    switch (type) {
      case 'consumption':
        await sheetsManager.setupConsumptionSheet();
        break;
      case 'purchases':
        await sheetsManager.setupPurchasesSheet();
        break;
      case 'corrections':
        await sheetsManager.setupCorrectionsSheet();
        break;
      case 'initialStock':
        await sheetsManager.setupInitialStockSheet();
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid sheet type' 
        });
    }
    
    res.json({ 
      success: true, 
      message: `${type} sheet setup complete` 
    });
  } catch (error: any) {
    console.error('Error setting up sheet:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to setup sheet' 
    });
  }
});

/**
 * @swagger
 * /api/sheets/clear-inventory:
 *   post:
 *     summary: Clear all inventory data
 *     tags: [Sheets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory cleared successfully
 */
router.post('/clear-inventory', auth, async (req: AuthRequest, res: Response) => {
  try {
    // Only allow admin users to clear inventory
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only admin users can clear inventory' 
      });
    }

    // Import models
    const { Transaction, Product } = await import('../models');
    const sequelize = (await import('../config/sequelize')).default;
    
    // Start a transaction
    const t = await sequelize.transaction();
    
    try {
      // Delete all transactions
      const deletedTransactions = await Transaction.destroy({
        where: {},
        transaction: t
      });
      
      // Reset all product stock levels and consumption
      await sequelize.query(
        `UPDATE "Products" 
         SET "currentStock" = 0, 
             "avgConsumption" = 0,
             "updatedAt" = NOW()`,
        { transaction: t }
      );
      
      // Get count of products
      const productCount = await Product.count({ transaction: t });
      
      // Commit the transaction
      await t.commit();
      
      res.json({ 
        success: true, 
        message: 'Inventory cleared successfully',
        details: {
          transactionsDeleted: deletedTransactions,
          productsReset: productCount
        }
      });
      
    } catch (error) {
      await t.rollback();
      throw error;
    }
    
  } catch (error: any) {
    console.error('Error clearing inventory:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to clear inventory' 
    });
  }
});

export default router;