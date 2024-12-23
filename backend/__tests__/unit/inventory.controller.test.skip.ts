import { Request, Response } from 'express';
import { Product, Inventory, InventoryTransaction } from '../../src/models';
import { TransactionType } from '../../src/models/InventoryTransaction';
import { 
  getAllInventory, 
  createTransaction, 
  bulkUploadInventory 
} from '../../src/controllers/inventory.controller';
import sequelize from '../../src/config/database';

// Mock the models and database
jest.mock('../../src/models', () => {
  const mockModel = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    init: jest.fn(),
    belongsTo: jest.fn()
  };

  return {
    Product: { ...mockModel },
    Inventory: { ...mockModel },
    InventoryTransaction: { ...mockModel },
    sequelize: {
      define: jest.fn(),
      model: jest.fn()
    }
  };
});

jest.mock('../../src/config/database', () => ({
  transaction: jest.fn((callback) => {
    if (typeof callback === 'function') {
      return callback({
        commit: jest.fn().mockResolvedValue(null),
        rollback: jest.fn().mockResolvedValue(null)
      });
    }
    return {
      commit: jest.fn().mockResolvedValue(null),
      rollback: jest.fn().mockResolvedValue(null)
    };
  }),
  literal: jest.fn()
}));

describe('Inventory Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject = {};

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn().mockImplementation(result => {
        responseObject = result;
        return mockResponse;
      }),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getAllInventory', () => {
    it('should return all inventory items with products', async () => {
      const mockInventory = [
        { 
          id: '1', 
          productId: '1',
          currentStock: 100,
          product: { artisCode: '901', name: 'Test Product' }
        }
      ];

      (Inventory.findAll as jest.Mock).mockResolvedValue(mockInventory);

      await getAllInventory(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockInventory);
    });
  });

  describe('createTransaction', () => {
    it('should create transaction and update inventory', async () => {
      mockRequest.body = {
        productId: '1',
        type: TransactionType.IN,
        quantity: 10,
        notes: 'Test transaction'
      };

      const mockTransaction = { id: '1', ...mockRequest.body };
      const mockInventory = {
        id: '1',
        currentStock: 100,
        update: jest.fn()
      };

      (InventoryTransaction.create as jest.Mock).mockResolvedValue(mockTransaction);
      (Inventory.findOne as jest.Mock).mockResolvedValue(mockInventory);

      await createTransaction(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransaction);
    });
  });

  describe('bulkUploadInventory', () => {
    it('should process valid Excel file and create transactions', async () => {
      const buffer = Buffer.from('dummy excel data');
      mockRequest.file = { buffer } as Express.Multer.File;

      const mockProduct = { id: '1', artisCode: '901' };
      (Product.findOne as jest.Mock).mockResolvedValue(mockProduct);
      
      await bulkUploadInventory(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toHaveProperty('message', 'Import completed');
    });
  });
}); 