import Product from './Product';
import Transaction from './Transaction';

export const initializeAssociations = () => {
  Product.hasMany(Transaction, {
    foreignKey: 'productId',
    as: 'transactions',
    onDelete: 'CASCADE'
  });

  Transaction.belongsTo(Product, {
    foreignKey: 'productId',
    onDelete: 'CASCADE'
  });
}; 