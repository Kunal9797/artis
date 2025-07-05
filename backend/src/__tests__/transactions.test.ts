import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import sequelize from '../config/sequelize';
import { Product, Transaction, User } from '../models';
import { QueryTypes } from 'sequelize';
import bcrypt from 'bcrypt';

// Test data
const testProducts = [
  {
    artisCodes: ['TEST001'],
    name: 'Test Product 1',
    supplierCode: 'SUP001',
    supplier: 'Test Supplier 1',
    category: 'Test Category',
    thickness: 0.8,
    currentStock: 0,
    avgConsumption: 0
  },
  {
    artisCodes: ['TEST002', 'TEST002B'],
    name: 'Test Product 2',
    supplierCode: 'SUP002',
    supplier: 'Test Supplier 2',
    category: 'Test Category',
    thickness: 1.0,
    currentStock: 0,
    avgConsumption: 0
  }
];

describe('Transaction System Tests', () => {
  let testProduct1: Product;
  let testProduct2: Product;
  let testUser: User;

  beforeAll(async () => {
    // Connect to test database
    await sequelize.authenticate();
    
    // Create test user
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    testUser = await User.create({
      username: 'testuser',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      phoneNumber: '1234567890',
      version: 1
    });
  });

  beforeEach(async () => {
    // Clear transactions
    await Transaction.destroy({ where: {} });
    
    // Reset products or create them
    await Product.destroy({ where: {} });
    testProduct1 = await Product.create(testProducts[0]);
    testProduct2 = await Product.create(testProducts[1]);
  });

  afterAll(async () => {
    // Cleanup
    await Transaction.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await User.destroy({ where: { username: 'testuser' } });
    await sequelize.close();
  });

  describe('Basic Transaction CRUD', () => {
    test('should create IN transaction and update stock', async () => {
      const transaction = await Transaction.create({
        productId: testProduct1.id,
        type: 'IN',
        quantity: 100,
        date: new Date(),
        notes: 'Test purchase'
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('IN');
      expect(transaction.quantity).toBe(100);

      // Check stock calculation
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

      expect((stockResult as any)[0].total_stock).toBe('100');
    });

    test('should create OUT transaction and update stock', async () => {
      // First add some stock
      await Transaction.create({
        productId: testProduct1.id,
        type: 'IN',
        quantity: 200,
        date: new Date(),
        notes: 'Initial stock'
      });

      // Then consume some
      const outTransaction = await Transaction.create({
        productId: testProduct1.id,
        type: 'OUT',
        quantity: 50,
        date: new Date(),
        notes: 'Test consumption',
        includeInAvg: true
      });

      expect(outTransaction.type).toBe('OUT');
      expect(outTransaction.includeInAvg).toBe(true);

      // Check stock calculation
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

      expect((stockResult as any)[0].total_stock).toBe('150');
    });

    test('should handle CORRECTION transactions correctly', async () => {
      // Initial stock
      await Transaction.create({
        productId: testProduct1.id,
        type: 'IN',
        quantity: 100,
        date: new Date()
      });

      // Positive correction
      await Transaction.create({
        productId: testProduct1.id,
        type: 'CORRECTION',
        quantity: 25,
        date: new Date(),
        notes: 'CORRECTION: +25 kg. Found extra stock'
      });

      // Negative correction
      await Transaction.create({
        productId: testProduct1.id,
        type: 'CORRECTION',
        quantity: -10,
        date: new Date(),
        notes: 'CORRECTION: -10 kg. Damaged goods'
      });

      // Check final stock
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

      expect((stockResult as any)[0].total_stock).toBe('115'); // 100 + 25 - 10
    });
  });

  describe('Average Consumption Calculations', () => {
    test('should calculate average consumption correctly', async () => {
      const consumptionData = [
        { month: '2024-01', quantity: 100 },
        { month: '2024-02', quantity: 120 },
        { month: '2024-03', quantity: 80 },
        { month: '2024-04', quantity: 140 }
      ];

      // Create consumption transactions
      for (const data of consumptionData) {
        await Transaction.create({
          productId: testProduct1.id,
          type: 'OUT',
          quantity: data.quantity,
          date: new Date(`${data.month}-15`),
          notes: `Consumption for ${data.month}`,
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

      expect(months).toBe(4);
      expect(totalConsumption).toBe(440);
      expect(average).toBe(110);
    });

    test('should exclude transactions with includeInAvg=false', async () => {
      // Regular consumption
      await Transaction.create({
        productId: testProduct1.id,
        type: 'OUT',
        quantity: 100,
        date: new Date('2024-01-15'),
        includeInAvg: true
      });

      // One-time large order (should not affect average)
      await Transaction.create({
        productId: testProduct1.id,
        type: 'OUT',
        quantity: 500,
        date: new Date('2024-01-20'),
        includeInAvg: false,
        notes: 'Special one-time order'
      });

      // Another regular consumption
      await Transaction.create({
        productId: testProduct1.id,
        type: 'OUT',
        quantity: 120,
        date: new Date('2024-02-15'),
        includeInAvg: true
      });

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
      const totalConsumption = parseFloat(result.total_consumption);
      
      expect(totalConsumption).toBe(220); // Should not include the 500
    });
  });

  describe('Transaction History and Balance', () => {
    test('should calculate running balance correctly', async () => {
      const transactions = [
        { type: 'IN', quantity: 100, date: '2024-01-01' },
        { type: 'OUT', quantity: 30, date: '2024-01-05' },
        { type: 'IN', quantity: 50, date: '2024-01-10' },
        { type: 'CORRECTION', quantity: -5, date: '2024-01-15' },
        { type: 'OUT', quantity: 40, date: '2024-01-20' }
      ];

      // Create transactions
      for (const t of transactions) {
        await Transaction.create({
          productId: testProduct1.id,
          type: t.type as any,
          quantity: t.quantity,
          date: new Date(t.date)
        });
      }

      // Get transactions with balance
      const transactionsWithBalance = await Transaction.findAll({
        where: { productId: testProduct1.id },
        order: [['date', 'ASC']]
      });

      let runningBalance = 0;
      const expectedBalances = [100, 70, 120, 115, 75];

      transactionsWithBalance.forEach((t, index) => {
        if (t.type === 'IN') {
          runningBalance += t.quantity;
        } else if (t.type === 'OUT') {
          runningBalance -= t.quantity;
        } else if (t.type === 'CORRECTION') {
          runningBalance += t.quantity;
        }
        expect(runningBalance).toBe(expectedBalances[index]);
      });
    });
  });

  describe('Bulk Operations', () => {
    test('should handle bulk transaction creation', async () => {
      const bulkTransactions = Array.from({ length: 100 }, (_, i) => ({
        productId: i % 2 === 0 ? testProduct1.id : testProduct2.id,
        type: 'IN' as const,
        quantity: Math.floor(Math.random() * 100) + 1,
        date: new Date(),
        notes: `Bulk transaction ${i + 1}`
      }));

      await Transaction.bulkCreate(bulkTransactions);

      const count = await Transaction.count();
      expect(count).toBe(100);

      // Verify both products have transactions
      const product1Count = await Transaction.count({
        where: { productId: testProduct1.id }
      });
      const product2Count = await Transaction.count({
        where: { productId: testProduct2.id }
      });

      expect(product1Count).toBeGreaterThan(0);
      expect(product2Count).toBeGreaterThan(0);
      expect(product1Count + product2Count).toBe(100);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle zero quantity transactions', async () => {
      const transaction = await Transaction.create({
        productId: testProduct1.id,
        type: 'IN',
        quantity: 0,
        date: new Date()
      });

      expect(transaction.quantity).toBe(0);
    });

    test('should handle very large quantities', async () => {
      const largeQuantity = 999999.99;
      const transaction = await Transaction.create({
        productId: testProduct1.id,
        type: 'IN',
        quantity: largeQuantity,
        date: new Date()
      });

      expect(transaction.quantity).toBe(largeQuantity);
    });

    test('should handle decimal quantities correctly', async () => {
      await Transaction.create({
        productId: testProduct1.id,
        type: 'IN',
        quantity: 100.55,
        date: new Date()
      });

      await Transaction.create({
        productId: testProduct1.id,
        type: 'OUT',
        quantity: 30.33,
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
          replacements: { productId: testProduct1.id },
          type: QueryTypes.SELECT
        }
      );

      expect(parseFloat((stockResult as any)[0].total_stock)).toBeCloseTo(70.22, 2);
    });

    test('should handle transactions for products with multiple codes', async () => {
      // Product 2 has multiple artis codes
      const transaction = await Transaction.create({
        productId: testProduct2.id,
        type: 'IN',
        quantity: 50,
        date: new Date()
      });

      expect(transaction.productId).toBe(testProduct2.id);
      
      // Verify the product relationship
      const product = await Product.findByPk(testProduct2.id);
      expect(product?.artisCodes).toContain('TEST002');
      expect(product?.artisCodes).toContain('TEST002B');
    });
  });

  describe('Date-based Queries', () => {
    test('should filter transactions by date range', async () => {
      // Create transactions across different months
      await Transaction.create({
        productId: testProduct1.id,
        type: 'IN',
        quantity: 100,
        date: new Date('2024-01-15')
      });

      await Transaction.create({
        productId: testProduct1.id,
        type: 'OUT',
        quantity: 50,
        date: new Date('2024-02-15')
      });

      await Transaction.create({
        productId: testProduct1.id,
        type: 'IN',
        quantity: 75,
        date: new Date('2024-03-15')
      });

      // Query February transactions
      const febTransactions = await Transaction.findAll({
        where: {
          productId: testProduct1.id,
          date: {
            $gte: new Date('2024-02-01'),
            $lt: new Date('2024-03-01')
          }
        }
      });

      expect(febTransactions).toHaveLength(1);
      expect(febTransactions[0].quantity).toBe(50);
    });

    test('should group transactions by month', async () => {
      // Create consumption data over several months
      const months = ['2024-01', '2024-02', '2024-03', '2024-01', '2024-02'];
      const quantities = [100, 150, 120, 50, 80];

      for (let i = 0; i < months.length; i++) {
        await Transaction.create({
          productId: testProduct1.id,
          type: 'OUT',
          quantity: quantities[i],
          date: new Date(`${months[i]}-15`),
          includeInAvg: true
        });
      }

      // Group by month
      const monthlyData = await sequelize.query(
        `SELECT 
          DATE_TRUNC('month', date) as month,
          SUM(quantity) as total_quantity,
          COUNT(*) as transaction_count
        FROM "Transactions"
        WHERE "productId" = :productId
          AND type = 'OUT'
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month`,
        {
          replacements: { productId: testProduct1.id },
          type: QueryTypes.SELECT
        }
      );

      expect(monthlyData).toHaveLength(3);
      expect((monthlyData[0] as any).total_quantity).toBe('150'); // Jan: 100 + 50
      expect((monthlyData[1] as any).total_quantity).toBe('230'); // Feb: 150 + 80
      expect((monthlyData[2] as any).total_quantity).toBe('120'); // Mar: 120
    });
  });
});

describe('Product Stock Update Tests', () => {
  let testProduct: Product;

  beforeEach(async () => {
    await Transaction.destroy({ where: {} });
    await Product.destroy({ where: {} });
    
    testProduct = await Product.create({
      artisCodes: ['STOCK001'],
      name: 'Stock Test Product',
      supplierCode: 'SUP001',
      supplier: 'Test Supplier',
      category: 'Test',
      thickness: 1.0,
      currentStock: 0,
      avgConsumption: 0
    });
  });

  test('should update product stock after transaction', async () => {
    // Create a transaction
    await Transaction.create({
      productId: testProduct.id,
      type: 'IN',
      quantity: 100,
      date: new Date()
    });

    // Manually update product stock (simulating what the controller does)
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

    const newStock = parseFloat((stockResult as any)[0].total_stock);
    
    await Product.update(
      { currentStock: newStock },
      { where: { id: testProduct.id } }
    );

    // Verify
    const updatedProduct = await Product.findByPk(testProduct.id);
    expect(updatedProduct?.currentStock).toBe(100);
  });
});