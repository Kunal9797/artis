import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';

/**
 * Batch update product stock and average consumption for multiple products
 * Much faster than updating products one by one
 */
export async function batchUpdateProductStock(productIds: string[], transaction?: any) {
  try {
    console.log(`Batch updating stock for ${productIds.length} products...`);
    
    // Create a proper UUID array for PostgreSQL
    const productIdList = productIds.map(id => `'${id}'::uuid`).join(',');
    
    // Update all products in a single query
    await sequelize.query(`
      WITH product_stock AS (
        SELECT 
          p.id,
          COALESCE(SUM(
            CASE 
              WHEN t.type = 'IN' THEN t.quantity
              WHEN t.type = 'OUT' THEN -t.quantity
              WHEN t.type = 'CORRECTION' THEN t.quantity
            END
          ), 0) as total_stock,
          COALESCE(AVG(
            CASE 
              WHEN t.type = 'OUT' AND t."includeInAvg" = true 
                AND t.date >= CURRENT_DATE - INTERVAL '12 months'
              THEN t.quantity
            END
          ), 0) as avg_consumption
        FROM "Products" p
        LEFT JOIN "Transactions" t ON t."productId" = p.id
        WHERE p.id IN (${productIdList})
        GROUP BY p.id
      )
      UPDATE "Products" p
      SET 
        "currentStock" = ps.total_stock,
        "avgConsumption" = ps.avg_consumption,
        "lastUpdated" = NOW()
      FROM product_stock ps
      WHERE p.id = ps.id
    `, {
      type: QueryTypes.UPDATE,
      transaction
    });
    
    console.log(`✅ Batch updated stock for ${productIds.length} products`);
    
  } catch (error) {
    console.error('Error in batch update:', error);
    throw error;
  }
}

/**
 * Update all products that have transactions
 */
export async function batchUpdateAllProductsStock(transaction?: any) {
  try {
    console.log('Batch updating stock for all products with transactions...');
    
    const result = await sequelize.query(`
      WITH product_stock AS (
        SELECT 
          p.id,
          COALESCE(SUM(
            CASE 
              WHEN t.type = 'IN' THEN t.quantity
              WHEN t.type = 'OUT' THEN -t.quantity
              WHEN t.type = 'CORRECTION' THEN t.quantity
            END
          ), 0) as total_stock,
          COALESCE(AVG(
            CASE 
              WHEN t.type = 'OUT' AND t."includeInAvg" = true 
                AND t.date >= CURRENT_DATE - INTERVAL '12 months'
              THEN t.quantity
            END
          ), 0) as avg_consumption
        FROM "Products" p
        LEFT JOIN "Transactions" t ON t."productId" = p.id
        WHERE EXISTS (SELECT 1 FROM "Transactions" WHERE "productId" = p.id)
        GROUP BY p.id
      )
      UPDATE "Products" p
      SET 
        "currentStock" = ps.total_stock,
        "avgConsumption" = ps.avg_consumption,
        "lastUpdated" = NOW()
      FROM product_stock ps
      WHERE p.id = ps.id
      RETURNING p.id
    `, {
      type: QueryTypes.UPDATE,
      transaction
    });
    
    const updatedCount = result[1];
    console.log(`✅ Batch updated stock for ${updatedCount} products`);
    
    return updatedCount;
  } catch (error) {
    console.error('Error in batch update all:', error);
    throw error;
  }
}