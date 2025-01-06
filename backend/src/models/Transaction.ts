import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import bcrypt from 'bcrypt';

interface TransactionAttributes {
  id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: Date;
  notes?: string;
  includeInAvg: boolean;
}

class Transaction extends Model {
  public id!: string;
  public productId!: string;
  public type!: 'IN' | 'OUT';
  public quantity!: number;
  public date!: Date;
  public notes?: string;
  public includeInAvg!: boolean;
}

Transaction.init(
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
      type: DataTypes.ENUM('IN', 'OUT'),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get() {
        const value = this.getDataValue('quantity');
        return value ? Number(parseFloat(value).toFixed(2)) : 0;
      },
      set(value: number) {
        this.setDataValue('quantity', Number(parseFloat(value.toString()).toFixed(2)));
      }
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    includeInAvg: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: 'Transaction',
    tableName: 'Transactions',
    timestamps: true
  }
);

export default Transaction; 