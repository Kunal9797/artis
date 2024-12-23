import request from 'supertest';
import { app } from '../../src/server';
import { Product, Inventory, InventoryTransaction } from '../../src/models';
import { TransactionType } from '../../src/models/InventoryTransaction';
import path from 'path';
import fs from 'fs';
import sequelize from '../../src/config/database.test';

describe('Inventory API', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    // Clear database before all tests
    await Promise.all([
      Product.destroy({ where: {}, force: true }),
      Inventory.destroy({ where: {}, force: true }),
      InventoryTransaction.destroy({ where: {}, force: true })
    ]);
  });

  afterAll(async () => {
    // Clear database after all tests
    await Promise.all([
      Product.destroy({ where: {}, force: true }),
      Inventory.destroy({ where: {}, force: true }),
      InventoryTransaction.destroy({ where: {}, force: true })
    ]);
    await sequelize.close();
  });

  describe('GET /api/inventory', () => {
    it('should return all inventory items', async () => {
      const product = await Product.create({
        artisCode: '901',
        name: 'Test Product'
      });

      await Inventory.create({
        productId: product.id,
        currentStock: 100
      });

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${global.testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(parseFloat(response.body[0].currentStock)).toBe(100);
    });
  });

  describe('POST /api/inventory/transaction', () => {
    it('should create new transaction and update inventory', async () => {
      const product = await Product.create({
        artisCode: '901',
        name: 'Test Product'
      });

      const response = await request(app)
        .post('/api/inventory/transaction')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          productId: product.id,
          type: TransactionType.IN,
          quantity: 100,
          notes: 'Initial stock'
        });

      expect(response.status).toBe(201);
      expect(response.body.quantity).toBe(100);

      const inventory = await Inventory.findOne({
        where: { productId: product.id }
      });
      expect(inventory?.currentStock).toBe(100);
    });
  });

  describe('POST /api/inventory/bulk', () => {
    it('should process Excel file and create transactions', async () => {
      const product = await Product.create({
        artisCode: '901',
        supplierCode: '5501',
        name: 'Test Product'
      });

      const testFilePath = path.join(__dirname, '../fixtures/test-inventory.xlsx');
      
      const response = await request(app)
        .post('/api/inventory/bulk')
        .set('Authorization', `Bearer ${global.testToken}`)
        .attach('file', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.processed.count).toBeGreaterThan(0);

      const inventory = await Inventory.findOne({
        where: { productId: product.id }
      });
      expect(inventory).toBeTruthy();
    });
  });
}); 