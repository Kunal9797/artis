import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';
import { Product, Transaction } from '../models';
import { SheetsManagerOptimizedService } from '../services/sheets-manager-optimized.service';

// Mock Google Sheets API
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn(() => ({
        getClient: jest.fn()
      }))
    },
    sheets: jest.fn(() => ({
      spreadsheets: {
        values: {
          get: jest.fn(),
          update: jest.fn(),
          clear: jest.fn()
        },
        batchUpdate: jest.fn(),
        get: jest.fn()
      }
    }))
  }
}));

describe('Google Sheets Sync Tests', () => {
  let sheetsManager: SheetsManagerOptimizedService;
  let testProduct1: Product;
  let testProduct2: Product;

  beforeAll(async () => {
    await sequelize.authenticate();
    
    // Create test products
    await Product.destroy({ where: {} });
    testProduct1 = await Product.create({
      artisCodes: ['101'],
      name: 'Test Design 1',
      supplierCode: 'TD001',
      supplier: 'Test Supplier',
      category: 'Test',
      thickness: 0.8,
      currentStock: 0,
      avgConsumption: 0
    });

    testProduct2 = await Product.create({
      artisCodes: ['102', '102A'],
      name: 'Test Design 2',
      supplierCode: 'TD002',
      supplier: 'Test Supplier',
      category: 'Test',
      thickness: 1.0,
      currentStock: 0,
      avgConsumption: 0
    });
  });

  beforeEach(async () => {
    await Transaction.destroy({ where: {} });
    
    // Reset product stocks
    await Product.update(
      { currentStock: 0, avgConsumption: 0 },
      { where: {} }
    );

    // Create new instance with mocked Google Sheets
    sheetsManager = new SheetsManagerOptimizedService();
  });

  afterAll(async () => {
    await Transaction.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await sequelize.close();
  });

  describe('Data Validation', () => {
    test('should validate consumption data correctly', () => {
      const validationMethod = (sheetsManager as any).validateConsumptionData;
      
      // Valid data
      const valid = validationMethod.call(sheetsManager, '101', '100', 'January 2024');
      expect(valid.isValid).toBe(true);
      expect(valid.errors).toHaveLength(0);
      
      // Invalid amount
      const invalidAmount = validationMethod.call(sheetsManager, '101', 'abc', 'January 2024');
      expect(invalidAmount.isValid).toBe(false);
      expect(invalidAmount.errors).toContain('Invalid consumption amount: abc');
      
      // Negative consumption
      const negative = validationMethod.call(sheetsManager, '101', '-50', 'January 2024');
      expect(negative.isValid).toBe(false);
      expect(negative.errors).toContain('Negative consumption not allowed: -50 kg');
      
      // Very high consumption (warning)
      const highAmount = validationMethod.call(sheetsManager, '101', '15000', 'January 2024');
      expect(highAmount.isValid).toBe(true);
      expect(highAmount.warnings).toContain('Unusually high consumption: 15000 kg (max expected: 10000 kg)');
    });

    test('should validate purchase data correctly', () => {
      const validationMethod = (sheetsManager as any).validatePurchaseData;
      
      // Valid data
      const valid = validationMethod.call(sheetsManager, '101', '2024-03-15', '500');
      expect(valid.isValid).toBe(true);
      expect(valid.errors).toHaveLength(0);
      
      // Invalid date
      const invalidDate = validationMethod.call(sheetsManager, '101', 'not-a-date', '500');
      expect(invalidDate.isValid).toBe(false);
      expect(invalidDate.errors).toContain('Invalid date format: not-a-date');
      
      // Future date
      const futureDate = validationMethod.call(sheetsManager, '101', '2026-01-01', '500');
      expect(futureDate.isValid).toBe(false);
      expect(futureDate.errors[0]).toContain('Date is in the future');
      
      // Very large purchase (warning)
      const largePurchase = validationMethod.call(sheetsManager, '101', '2024-03-15', '60000');
      expect(largePurchase.isValid).toBe(true);
      expect(largePurchase.warnings).toContain('Unusually large purchase: 60000 kg (max expected: 50000 kg)');
    });

    test('should validate correction data correctly', () => {
      const validationMethod = (sheetsManager as any).validateCorrectionData;
      
      // Valid positive correction
      const validPos = validationMethod.call(sheetsManager, '101', '25', '2024-03-15');
      expect(validPos.isValid).toBe(true);
      expect(validPos.errors).toHaveLength(0);
      
      // Valid negative correction
      const validNeg = validationMethod.call(sheetsManager, '101', '-10', '2024-03-15');
      expect(validNeg.isValid).toBe(true);
      expect(validNeg.errors).toHaveLength(0);
      
      // Correction with text (like from sheets)
      const withText = validationMethod.call(sheetsManager, '101', '16 Stock Adjustment', '2024-03-15');
      expect(withText.isValid).toBe(true);
      expect(withText.errors).toHaveLength(0);
      
      // Invalid format
      const invalid = validationMethod.call(sheetsManager, '101', 'invalid', '2024-03-15');
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toContain('Invalid correction format: invalid');
      
      // Large correction (warning)
      const large = validationMethod.call(sheetsManager, '101', '6000', '2024-03-15');
      expect(large.isValid).toBe(true);
      expect(large.warnings).toContain('Large correction amount: 6000 kg (max expected: ±5000 kg)');
    });
  });

  describe('Stock Calculations After Sync', () => {
    test('should calculate stock correctly after mixed transactions', async () => {
      // Simulate sync results
      const transactions = [
        { productId: testProduct1.id, type: 'IN', quantity: 1000, date: new Date('2024-01-01') },
        { productId: testProduct1.id, type: 'OUT', quantity: 300, date: new Date('2024-01-15'), includeInAvg: true },
        { productId: testProduct1.id, type: 'IN', quantity: 500, date: new Date('2024-02-01') },
        { productId: testProduct1.id, type: 'OUT', quantity: 200, date: new Date('2024-02-15'), includeInAvg: true },
        { productId: testProduct1.id, type: 'CORRECTION', quantity: -50, date: new Date('2024-03-01') },
        { productId: testProduct1.id, type: 'CORRECTION', quantity: 25, date: new Date('2024-03-15') }
      ];

      await Transaction.bulkCreate(transactions);

      // Calculate stock
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
          replacements: { productId: testProduct1.id },
          type: QueryTypes.SELECT
        }
      );

      const stock = parseFloat((stockResult as any)[0].total_stock);
      expect(stock).toBe(975); // 1000 - 300 + 500 - 200 - 50 + 25
    });

    test('should calculate average consumption correctly', async () => {
      // Create consumption over 6 months
      const consumptionData = [
        { month: '2024-01', quantity: 100 },
        { month: '2024-02', quantity: 120 },
        { month: '2024-03', quantity: 90 },
        { month: '2024-04', quantity: 130 },
        { month: '2024-05', quantity: 110 },
        { month: '2024-06', quantity: 100 }
      ];

      for (const data of consumptionData) {
        await Transaction.create({
          productId: testProduct1.id,
          type: 'OUT',
          quantity: data.quantity,
          date: new Date(`${data.month}-15`),
          includeInAvg: true
        });
      }

      // Calculate average
      const avgResult = await sequelize.query(
        `SELECT 
          COUNT(DISTINCT DATE_TRUNC('month', date)) as months,
          COALESCE(SUM(quantity), 0) as total_consumption
        FROM "Transactions"
        WHERE "productId" = :productId
          AND type = 'OUT'
          AND "includeInAvg" = true`,
        {
          replacements: { productId: testProduct1.id },
          type: QueryTypes.SELECT
        }
      );

      const result = avgResult[0] as any;
      const months = parseInt(result.months);
      const totalConsumption = parseFloat(result.total_consumption);
      const average = totalConsumption / months;

      expect(months).toBe(6);
      expect(totalConsumption).toBe(650);
      expect(average).toBeCloseTo(108.33, 2);
    });
  });

  describe('Edge Cases in Sync', () => {
    test('should handle products with multiple codes', async () => {
      // Product 2 has codes ['102', '102A']
      const transactions = [
        { productId: testProduct2.id, type: 'IN', quantity: 100, date: new Date() },
        { productId: testProduct2.id, type: 'OUT', quantity: 30, date: new Date() }
      ];

      await Transaction.bulkCreate(transactions);

      const count = await Transaction.count({ where: { productId: testProduct2.id } });
      expect(count).toBe(2);

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
          replacements: { productId: testProduct2.id },
          type: QueryTypes.SELECT
        }
      );

      expect((stockResult as any)[0].total_stock).toBe('70');
    });

    test('should handle decimal quantities in sync', async () => {
      const transactions = [
        { productId: testProduct1.id, type: 'IN', quantity: 100.75, date: new Date() },
        { productId: testProduct1.id, type: 'OUT', quantity: 30.25, date: new Date() },
        { productId: testProduct1.id, type: 'CORRECTION', quantity: 5.5, date: new Date() }
      ];

      await Transaction.bulkCreate(transactions);

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
          replacements: { productId: testProduct1.id },
          type: QueryTypes.SELECT
        }
      );

      expect(parseFloat((stockResult as any)[0].total_stock)).toBeCloseTo(76, 2);
    });

    test('should handle empty sync (no data)', async () => {
      const count = await Transaction.count();
      expect(count).toBe(0);

      const products = await Product.findAll();
      products.forEach(product => {
        expect(product.currentStock).toBe(0);
        expect(product.avgConsumption).toBe(0);
      });
    });
  });
});