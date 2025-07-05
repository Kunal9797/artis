import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import sequelize from '../config/sequelize';
import { Product, Transaction } from '../models';
import { QueryTypes } from 'sequelize';

describe('Basic Transaction Tests', () => {
  beforeAll(async () => {
    try {
      await sequelize.authenticate();
      console.log('Database connected for tests');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('should connect to database', async () => {
    const connection = await sequelize.authenticate();
    expect(connection).toBeUndefined(); // authenticate returns void on success
  });

  test('should create a transaction', async () => {
    // First, create a product
    const product = await Product.create({
      artisCodes: ['TEST001'],
      name: 'Test Product',
      supplierCode: 'SUP001',
      supplier: 'Test Supplier',
      category: 'Test',
      thickness: 1.0,
      currentStock: 0,
      avgConsumption: 0
    });

    // Create a transaction
    const transaction = await Transaction.create({
      productId: product.id,
      type: 'IN',
      quantity: 100,
      date: new Date(),
      notes: 'Test transaction'
    });

    expect(transaction).toBeDefined();
    expect(transaction.type).toBe('IN');
    expect(transaction.quantity).toBe(100);

    // Cleanup
    await transaction.destroy();
    await product.destroy();
  });

  test('should calculate stock correctly', async () => {
    // Create product
    const product = await Product.create({
      artisCodes: ['TEST002'],
      name: 'Stock Test Product',
      supplierCode: 'SUP002',
      supplier: 'Test Supplier',
      category: 'Test',
      thickness: 1.0,
      currentStock: 0,
      avgConsumption: 0
    });

    // Create transactions
    await Transaction.create({
      productId: product.id,
      type: 'IN',
      quantity: 100,
      date: new Date()
    });

    await Transaction.create({
      productId: product.id,
      type: 'OUT',
      quantity: 30,
      date: new Date()
    });

    await Transaction.create({
      productId: product.id,
      type: 'CORRECTION',
      quantity: -5,
      date: new Date()
    });

    // Calculate stock
    const result = await sequelize.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN type = 'IN' THEN quantity
          WHEN type = 'OUT' THEN -quantity
          WHEN type = 'CORRECTION' THEN quantity
        END
      ), 0) as total_stock
      FROM "Transactions"
      WHERE "productId" = :productId`,
      {
        replacements: { productId: product.id },
        type: QueryTypes.SELECT
      }
    );

    const stock = parseFloat((result as any)[0].total_stock);
    expect(stock).toBe(65); // 100 - 30 - 5

    // Cleanup
    await Transaction.destroy({ where: { productId: product.id } });
    await product.destroy();
  });
});