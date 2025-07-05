import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import sequelize from '../config/sequelize';
import { Product, Transaction } from '../models';
import { QueryTypes } from 'sequelize';

describe('Stock Calculation Tests', () => {
  let testProduct: Product;

  beforeAll(async () => {
    await sequelize.authenticate();
  });

  beforeEach(async () => {
    // Clean up
    await Transaction.destroy({ where: {} });
    await Product.destroy({ where: {} });
    
    // Create test product
    testProduct = await Product.create({
      artisCodes: ['CALC001'],
      name: 'Calculation Test Product',
      supplierCode: 'CAL001',
      supplier: 'Test Supplier',
      category: 'Test',
      thickness: 1.0,
      currentStock: 0,
      avgConsumption: 0
    });
  });

  afterAll(async () => {
    await Transaction.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await sequelize.close();
  });

  describe('Stock Calculations', () => {
    test('IN transactions should add to stock', async () => {
      await Transaction.create({
        productId: testProduct.id,
        type: 'IN',
        quantity: 100,
        date: new Date()
      });

      await Transaction.create({
        productId: testProduct.id,
        type: 'IN',
        quantity: 50,
        date: new Date()
      });

      const stockResult = await sequelize.query(
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
          replacements: { productId: testProduct.id },
          type: QueryTypes.SELECT
        }
      );

      expect(parseFloat((stockResult as any)[0].total_stock)).toBe(150);
    });

    test('OUT transactions should subtract from stock', async () => {
      await Transaction.create({
        productId: testProduct.id,
        type: 'IN',
        quantity: 200,
        date: new Date()
      });

      await Transaction.create({
        productId: testProduct.id,
        type: 'OUT',
        quantity: 75,
        date: new Date()
      });

      const stockResult = await sequelize.query(
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
          replacements: { productId: testProduct.id },
          type: QueryTypes.SELECT
        }
      );

      expect(parseFloat((stockResult as any)[0].total_stock)).toBe(125);
    });

    test('CORRECTION transactions should adjust stock correctly', async () => {
      await Transaction.create({
        productId: testProduct.id,
        type: 'IN',
        quantity: 100,
        date: new Date()
      });

      // Positive correction
      await Transaction.create({
        productId: testProduct.id,
        type: 'CORRECTION',
        quantity: 20,
        date: new Date()
      });

      // Negative correction
      await Transaction.create({
        productId: testProduct.id,
        type: 'CORRECTION',
        quantity: -15,
        date: new Date()
      });

      const stockResult = await sequelize.query(
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
          replacements: { productId: testProduct.id },
          type: QueryTypes.SELECT
        }
      );

      expect(parseFloat((stockResult as any)[0].total_stock)).toBe(105); // 100 + 20 - 15
    });

    test('Mixed transactions should calculate correctly', async () => {
      const transactions = [
        { type: 'IN', quantity: 1000 },
        { type: 'OUT', quantity: 300 },
        { type: 'IN', quantity: 500 },
        { type: 'OUT', quantity: 200 },
        { type: 'CORRECTION', quantity: -50 },
        { type: 'CORRECTION', quantity: 25 }
      ];

      for (const t of transactions) {
        await Transaction.create({
          productId: testProduct.id,
          type: t.type as any,
          quantity: t.quantity,
          date: new Date()
        });
      }

      const stockResult = await sequelize.query(
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
          replacements: { productId: testProduct.id },
          type: QueryTypes.SELECT
        }
      );

      // 1000 - 300 + 500 - 200 - 50 + 25 = 975
      expect(parseFloat((stockResult as any)[0].total_stock)).toBe(975);
    });
  });

  describe('Average Consumption Calculations', () => {
    test('should calculate monthly average correctly', async () => {
      // Create consumption for different months
      const consumptionData = [
        { date: '2024-01-15', quantity: 100 },
        { date: '2024-02-15', quantity: 120 },
        { date: '2024-03-15', quantity: 80 },
        { date: '2024-04-15', quantity: 140 }
      ];

      for (const data of consumptionData) {
        await Transaction.create({
          productId: testProduct.id,
          type: 'OUT',
          quantity: data.quantity,
          date: new Date(data.date),
          includeInAvg: true
        });
      }

      const avgResult = await sequelize.query(
        `SELECT 
          COUNT(DISTINCT DATE_TRUNC('month', date)) as months,
          COALESCE(SUM(quantity), 0) as total_consumption
        FROM "Transactions"
        WHERE "productId" = :productId
          AND type = 'OUT'
          AND "includeInAvg" = true`,
        {
          replacements: { productId: testProduct.id },
          type: QueryTypes.SELECT
        }
      );

      const result = avgResult[0] as any;
      expect(result.months).toBe('4');
      expect(parseFloat(result.total_consumption)).toBe(440);
      
      const average = parseFloat(result.total_consumption) / parseInt(result.months);
      expect(average).toBe(110);
    });

    test('should exclude non-average transactions', async () => {
      await Transaction.create({
        productId: testProduct.id,
        type: 'OUT',
        quantity: 100,
        date: new Date('2024-01-15'),
        includeInAvg: true
      });

      await Transaction.create({
        productId: testProduct.id,
        type: 'OUT',
        quantity: 500, // Large one-time order
        date: new Date('2024-01-20'),
        includeInAvg: false
      });

      await Transaction.create({
        productId: testProduct.id,
        type: 'OUT',
        quantity: 120,
        date: new Date('2024-02-15'),
        includeInAvg: true
      });

      const avgResult = await sequelize.query(
        `SELECT 
          COALESCE(SUM(quantity), 0) as total_consumption
        FROM "Transactions"
        WHERE "productId" = :productId
          AND type = 'OUT'
          AND "includeInAvg" = true`,
        {
          replacements: { productId: testProduct.id },
          type: QueryTypes.SELECT
        }
      );

      expect(parseFloat((avgResult[0] as any).total_consumption)).toBe(220); // Should not include 500
    });
  });

  describe('Google Sheets Sync Scenarios', () => {
    test('should handle bulk transaction creation', async () => {
      const bulkData = [];
      for (let i = 0; i < 50; i++) {
        bulkData.push({
          productId: testProduct.id,
          type: 'IN' as const,
          quantity: 10,
          date: new Date(),
          notes: `Bulk ${i + 1}`
        });
      }

      await Transaction.bulkCreate(bulkData);

      const count = await Transaction.count({ where: { productId: testProduct.id } });
      expect(count).toBe(50);

      const stockResult = await sequelize.query(
        `SELECT COALESCE(SUM(quantity), 0) as total
        FROM "Transactions"
        WHERE "productId" = :productId AND type = 'IN'`,
        {
          replacements: { productId: testProduct.id },
          type: QueryTypes.SELECT
        }
      );

      expect(parseFloat((stockResult[0] as any).total)).toBe(500); // 50 * 10
    });

    test('should handle decimal quantities from sheets', async () => {
      await Transaction.create({
        productId: testProduct.id,
        type: 'IN',
        quantity: 100.55,
        date: new Date()
      });

      await Transaction.create({
        productId: testProduct.id,
        type: 'OUT',
        quantity: 30.33,
        date: new Date()
      });

      await Transaction.create({
        productId: testProduct.id,
        type: 'CORRECTION',
        quantity: 5.12,
        date: new Date()
      });

      const stockResult = await sequelize.query(
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
          replacements: { productId: testProduct.id },
          type: QueryTypes.SELECT
        }
      );

      const stock = parseFloat((stockResult as any)[0].total_stock);
      expect(stock).toBeCloseTo(75.34, 2); // 100.55 - 30.33 + 5.12
    });
  });
});