import { Request, Response } from 'express';
import BulkOperation from '../models/BulkOperation';
import User from '../models/User';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../config/sequelize';

// Get all bulk operations history
export const getOperationsHistory = async (req: Request, res: Response) => {
  try {
    const operations = await BulkOperation.findAll({
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'email', 'firstName', 'lastName']
      }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json(operations);
  } catch (error) {
    console.error('Error fetching operations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch operations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a specific operation
export const deleteOperation = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const operation = await BulkOperation.findByPk(id, { transaction: t });
    if (!operation) {
      await t.rollback();
      return res.status(404).json({ error: 'Operation not found' });
    }

    // Find all transactions associated with this operation
    const associatedTransactions = await sequelize.query(`
      SELECT DISTINCT "productId" 
      FROM "Transactions" 
      WHERE "operationId" = :operationId
    `, {
      replacements: { operationId: id },
      type: QueryTypes.SELECT,
      transaction: t
    });

    const affectedProductIds = associatedTransactions.map((row: any) => row.productId);
    console.log(`Deleting operation ${id}, affecting ${affectedProductIds.length} products`);

    // Delete all transactions associated with this operation
    const deletedCount = await sequelize.query(`
      DELETE FROM "Transactions" 
      WHERE "operationId" = :operationId
    `, {
      replacements: { operationId: id },
      type: QueryTypes.DELETE,
      transaction: t
    });

    console.log(`Deleted ${deletedCount} transactions`);

    // Update stock for affected products
    if (affectedProductIds.length > 0) {
      const { batchUpdateProductStock } = require('../utils/batchUpdateStock');
      await batchUpdateProductStock(affectedProductIds, t);
      console.log(`Updated stock for ${affectedProductIds.length} products`);
    }

    // Delete the operation record
    await operation.destroy({ transaction: t });

    await t.commit();
    
    res.json({ 
      message: 'Operation deleted successfully',
      transactionsDeleted: deletedCount,
      productsUpdated: affectedProductIds.length
    });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting operation:', error);
    res.status(500).json({ 
      error: 'Failed to delete operation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get operation details
export const getOperationDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const operation = await BulkOperation.findByPk(id, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'username', 'email', 'firstName', 'lastName']
      }]
    });

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    res.json(operation);
  } catch (error) {
    console.error('Error fetching operation details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch operation details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Clear all operations history
export const clearAllOperations = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    // Check if we should delete ALL transactions or just those with operationId
    // For now, we'll delete ALL transactions since operationId might not be set for older data
    const deleteAllTransactions = true; // You can make this configurable later
    
    // Find all products that have transactions
    const affectedProducts = await sequelize.query(`
      SELECT DISTINCT "productId" 
      FROM "Transactions"
    `, {
      type: QueryTypes.SELECT,
      transaction: t
    });

    const affectedProductIds = affectedProducts.map((row: any) => row.productId);
    console.log(`Clearing all operations, affecting ${affectedProductIds.length} products`);

    // Delete transactions based on the flag
    let deletedTransactions;
    if (deleteAllTransactions) {
      // Delete ALL transactions (for clearing all inventory data)
      deletedTransactions = await sequelize.query(`
        DELETE FROM "Transactions"
      `, {
        type: QueryTypes.DELETE,
        transaction: t
      });
      console.log(`Deleted ALL ${deletedTransactions} transactions`);
    } else {
      // Delete only transactions from bulk operations
      deletedTransactions = await sequelize.query(`
        DELETE FROM "Transactions" 
        WHERE "operationId" IS NOT NULL
      `, {
        type: QueryTypes.DELETE,
        transaction: t
      });
      console.log(`Deleted ${deletedTransactions} bulk operation transactions`);
    }

    // Update stock for affected products (reset to 0)
    if (affectedProductIds.length > 0) {
      // Since we're deleting all transactions, we can just reset stock to 0
      await sequelize.query(`
        UPDATE "Products"
        SET 
          "currentStock" = 0,
          "avgConsumption" = 0,
          "lastUpdated" = NOW()
        WHERE id IN (${affectedProductIds.map(id => `'${id}'::uuid`).join(',')})
      `, {
        type: QueryTypes.UPDATE,
        transaction: t
      });
      console.log(`Reset stock to 0 for ${affectedProductIds.length} products`);
    }

    // Delete all bulk operation records
    await BulkOperation.destroy({
      where: {},
      transaction: t
    });

    await t.commit();

    res.json({ 
      message: 'All operations cleared successfully',
      transactionsDeleted: typeof deletedTransactions === 'number' ? deletedTransactions : 0,
      productsUpdated: affectedProductIds.length
    });
  } catch (error) {
    await t.rollback();
    console.error('Error clearing operations:', error);
    res.status(500).json({ 
      error: 'Failed to clear operations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};