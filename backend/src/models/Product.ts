import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';

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
  public deletedAt?: Date;
  public deletedBy?: string;
  public deletionReason?: string;

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
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deletedBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deletionReason: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Product',
  tableName: 'Products',
  paranoid: true,
  deletedAt: 'deletedAt'
});

export default Product; 