import Product from './Product';
import Transaction from './Transaction';
import { Lead, User, SalesTeam, BulkOperation, SyncHistory } from './index';

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

  // Lead associations
  Lead.belongsTo(SalesTeam, { 
    as: 'assignee', 
    foreignKey: 'assignedTo'
  });
  Lead.belongsTo(User, { 
    as: 'assigner', 
    foreignKey: 'assignedBy'
  });
  SalesTeam.hasMany(Lead, {
    as: 'assignedLeads',
    foreignKey: 'assignedTo'
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
}; 