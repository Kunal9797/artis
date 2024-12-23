import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import Product from './Product';

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT'
}

class InventoryTransaction extends Model {
  public id!: string;
  public productId!: string;
  public type!: TransactionType;
  public quantity!: number;
  public date!: Date;
  public notes?: string;
}

InventoryTransaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TransactionType)),
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'InventoryTransaction',
    tableName: 'InventoryTransactions'
  }
);

InventoryTransaction.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

export default InventoryTransaction; 