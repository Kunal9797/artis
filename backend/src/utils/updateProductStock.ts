import Product from '../models/Product';
import Transaction from '../models/Transaction';
import sequelize from '../config/sequelize';
import { Op, QueryTypes } from 'sequelize';

/**
 * Update product's currentStock and avgConsumption based on transactions
 */
export async function updateProductStock(productId: string, transaction?: any) {
  try {
    // Calculate current stock from all transactions
    const stockResult = await sequelize.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN type = 'IN' THEN quantity
          WHEN type = 'OUT' THEN -quantity
          WHEN type = 'CORRECTION' THEN quantity
        END
      ), 0) as total_stock
      FROM "Transactions"
      WHERE "productId" = :productId
    `, {
      replacements: { productId },
      type: QueryTypes.SELECT,
      transaction
    });

    const currentStock = parseFloat((stockResult as any)[0].total_stock) || 0;

    // Calculate average consumption (last 12 months to accommodate older data)
    const avgResult = await sequelize.query(`
      SELECT COALESCE(AVG(quantity), 0) as avg_consumption
      FROM "Transactions"
      WHERE "productId" = :productId
        AND type = 'OUT'
        AND "includeInAvg" = true
        AND date >= CURRENT_DATE - INTERVAL '12 months'
    `, {
      replacements: { productId },
      type: QueryTypes.SELECT,
      transaction
    });

    const avgConsumption = parseFloat((avgResult as any)[0].avg_consumption) || 0;

    // Update the product
    await Product.update(
      {
        currentStock,
        avgConsumption,
        lastUpdated: new Date()
      },
      {
        where: { id: productId },
        transaction
      }
    );

    console.log(`Updated product ${productId}: stock=${currentStock}, avg=${avgConsumption}`);
    
    return { currentStock, avgConsumption };
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
}

/**
 * Batch update all products' stock and consumption
 */
export async function updateAllProductsStock(transaction?: any) {
  try {
    console.log('Updating stock for all products...');
    
    // Get all products that have transactions
    const productsWithTransactions = await sequelize.query(`
      SELECT DISTINCT "productId" FROM "Transactions"
    `, {
      type: QueryTypes.SELECT,
      transaction
    });

    console.log(`Found ${productsWithTransactions.length} products with transactions`);

    // Update each product
    let updated = 0;
    for (const row of productsWithTransactions as any[]) {
      await updateProductStock(row.productId, transaction);
      updated++;
      
      if (updated % 50 === 0) {
        console.log(`Updated ${updated}/${productsWithTransactions.length} products...`);
      }
    }

    console.log(`✅ Updated stock for ${updated} products`);
    return updated;
  } catch (error) {
    console.error('Error updating all products stock:', error);
    throw error;
  }
}