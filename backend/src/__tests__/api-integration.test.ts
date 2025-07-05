import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../server';
import sequelize from '../config/sequelize';
import { Product, Transaction, User } from '../models';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('API Integration Tests', () => {
  let authToken: string;
  let testUser: User;
  let testProduct: Product;
  let server: any;

  beforeAll(async () => {
    // Start server
    server = app.listen(0); // Random port
    
    await sequelize.authenticate();
    
    // Create test user
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    testUser = await User.create({
      username: 'apitest',
      password: hashedPassword,
      role: 'admin',
      firstName: 'API Test',
      lastName: 'User',
      email: 'apitest@test.com',
      phoneNumber: '1234567890',
      version: 1
    });

    // Generate auth token
    authToken = jwt.sign(
      { id: testUser.id, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  beforeEach(async () => {
    await Transaction.destroy({ where: {} });
    await Product.destroy({ where: {} });
    
    // Create test product
    testProduct = await Product.create({
      artisCodes: ['API001'],
      name: 'API Test Product',
      supplierCode: 'SUP001',
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
    await User.destroy({ where: { username: 'apitest' } });
    await sequelize.close();
    server.close();
  });

  describe('GET /api/inventory', () => {
    test('should return all inventory items', async () => {
      // Add some transactions
      await Transaction.create({
        productId: testProduct.id,
        type: 'IN',
        quantity: 100,
        date: new Date()
      });

      const response = await request(server)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should require authentication', async () => {
      const response = await request(server)
        .get('/api/inventory');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/inventory/transactions/:productId', () => {
    test('should return product transactions with balance', async () => {
      // Create some transactions
      await Transaction.create({
        productId: testProduct.id,
        type: 'IN',
        quantity: 100,
        date: new Date('2024-01-01')
      });

      await Transaction.create({
        productId: testProduct.id,
        type: 'OUT',
        quantity: 30,
        date: new Date('2024-01-15')
      });

      const response = await request(server)
        .get(`/api/inventory/transactions/${testProduct.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('currentStock');
      expect(response.body).toHaveProperty('transactions');
      expect(response.body.currentStock).toBe(70);
      expect(response.body.transactions).toHaveLength(2);
      
      // Check transactions are in reverse order (newest first)
      expect(response.body.transactions[0].type).toBe('OUT');
      expect(response.body.transactions[1].type).toBe('IN');
    });
  });

  describe('POST /api/inventory/transaction', () => {
    test('should create a new transaction', async () => {
      const transactionData = {
        productId: testProduct.id,
        type: 'IN',
        quantity: 50,
        date: new Date().toISOString(),
        notes: 'Test purchase'
      };

      const response = await request(server)
        .post('/api/inventory/transaction')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('IN');
      expect(response.body.quantity).toBe(50);

      // Verify transaction was created
      const count = await Transaction.count();
      expect(count).toBe(1);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        // Missing productId
        type: 'IN',
        quantity: 50
      };

      const response = await request(server)
        .post('/api/inventory/transaction')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });

    test('should handle CORRECTION transactions', async () => {
      const correctionData = {
        productId: testProduct.id,
        type: 'CORRECTION',
        quantity: -25,
        date: new Date().toISOString(),
        notes: 'Stock adjustment'
      };

      const response = await request(server)
        .post('/api/inventory/transaction')
        .set('Authorization', `Bearer ${authToken}`)
        .send(correctionData);

      expect(response.status).toBe(201);
      expect(response.body.type).toBe('CORRECTION');
      expect(response.body.quantity).toBe(-25);
    });
  });

  describe('GET /api/inventory/recent', () => {
    test('should return recent transactions', async () => {
      // Create transactions
      const transactions = [];
      for (let i = 0; i < 5; i++) {
        transactions.push({
          productId: testProduct.id,
          type: i % 2 === 0 ? 'IN' : 'OUT',
          quantity: 10 * (i + 1),
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Past i days
        });
      }
      
      await Transaction.bulkCreate(transactions);

      const response = await request(server)
        .get('/api/inventory/recent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(10); // Default limit
    });
  });

  describe('Google Sheets Endpoints', () => {
    test('GET /api/sheets/pending should return pending counts', async () => {
      const response = await request(server)
        .get('/api/sheets/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('consumption');
      expect(response.body.data).toHaveProperty('purchases');
      expect(response.body.data).toHaveProperty('corrections');
    });

    test('POST /api/sheets/clear-inventory should require admin', async () => {
      // Create non-admin user
      const regularUser = await User.create({
        username: 'regular',
        password: await bcrypt.hash('pass', 10),
        role: 'user',
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular@test.com',
        phoneNumber: '1234567890',
        version: 1
      });

      const regularToken = jwt.sign(
        { id: regularUser.id, role: regularUser.role },
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(server)
        .post('/api/sheets/clear-inventory')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('admin');

      await User.destroy({ where: { id: regularUser.id } });
    });

    test('POST /api/sheets/clear-inventory should clear all transactions', async () => {
      // Create some transactions
      await Transaction.bulkCreate([
        { productId: testProduct.id, type: 'IN', quantity: 100, date: new Date() },
        { productId: testProduct.id, type: 'OUT', quantity: 50, date: new Date() }
      ]);

      const response = await request(server)
        .post('/api/sheets/clear-inventory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.details.transactionsDeleted).toBe(2);

      // Verify transactions are deleted
      const count = await Transaction.count();
      expect(count).toBe(0);

      // Verify product stock is reset
      const product = await Product.findByPk(testProduct.id);
      expect(product?.currentStock).toBe(0);
      expect(product?.avgConsumption).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid product ID', async () => {
      const response = await request(server)
        .get('/api/inventory/transactions/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
    });

    test('should handle non-existent product', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(server)
        .get(`/api/inventory/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to fetch transactions');
    });
  });
});