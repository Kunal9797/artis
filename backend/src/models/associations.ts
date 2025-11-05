import Product from './Product';
import Transaction from './Transaction';
import { User, BulkOperation, SyncHistory, Contact, PurchaseOrder, ConsumptionForecast } from './index';

export const initializeAssociations = () => {
  Product.hasMany(Transaction, {
    foreignKey: 'productId',
    as: 'transactions',
    onDelete: 'CASCADE'
  });

  Transaction.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product',
    onDelete: 'CASCADE'
  });

  // BulkOperation associations
  BulkOperation.belongsTo(User, {
    foreignKey: 'uploadedBy',
    as: 'uploader'
  });

  BulkOperation.hasMany(Transaction, {
    foreignKey: 'operationId',
    as: 'transactions'
  });

  Transaction.belongsTo(BulkOperation, {
    foreignKey: 'operationId',
    as: 'operation'
  });

  // SyncHistory associations
  SyncHistory.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  User.hasMany(SyncHistory, {
    foreignKey: 'userId',
    as: 'syncHistories'
  });

  SyncHistory.hasMany(Transaction, {
    foreignKey: 'syncBatchId',
    sourceKey: 'syncBatchId',
    as: 'transactions'
  });

  Transaction.belongsTo(SyncHistory, {
    foreignKey: 'syncBatchId',
    targetKey: 'syncBatchId',
    as: 'syncHistory'
  });

  // Procurement associations
  Product.hasMany(PurchaseOrder, {
    foreignKey: 'productId',
    as: 'purchaseOrders'
  });

  Product.hasMany(ConsumptionForecast, {
    foreignKey: 'productId',
    as: 'forecasts'
  });

  PurchaseOrder.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
  });

  PurchaseOrder.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });

  PurchaseOrder.belongsTo(User, {
    foreignKey: 'approvedBy',
    as: 'approver'
  });

  ConsumptionForecast.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
  });

  ConsumptionForecast.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
}; 