import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import Transaction from './Transaction';

class Product extends Model {
  public id!: string;
  public artisCodes!: string[];
  public name?: string;
  public supplier!: string;
  public category?: string;
  public supplierCode!: string;
  public currentStock!: number;
  public avgConsumption!: number;
  public lastUpdated!: Date;
  public minStockLevel?: number;
  public gsm?: string;
  public catalogs?: string[];
  public texture?: string;
  public thickness?: string;

}

Product.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  artisCodes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  supplier: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: DataTypes.STRING,
  supplierCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  currentStock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  avgConsumption: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  minStockLevel: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  gsm: {
    type: DataTypes.STRING,
    allowNull: true
  },
  catalogs: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: []
  },
  texture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  thickness: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Product',
  tableName: 'Products'
});

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

export default Product; 