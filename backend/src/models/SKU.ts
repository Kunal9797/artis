import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import Product from './Product';

export enum InventoryType {
  DESIGN_PAPER_ROLL = 'DESIGN_PAPER_ROLL',
  DESIGN_PAPER_SHEET = 'DESIGN_PAPER_SHEET',
  LAMINATE_SHEET = 'LAMINATE_SHEET'
}

export enum MeasurementUnit {
  WEIGHT = 'WEIGHT',
  UNITS = 'UNITS'
}

interface SKUAttributes {
  id: string;
  productId: string;
  quantity: number;
  minimumStock?: number;
  reorderPoint?: number;
}

interface SKUCreationAttributes extends Omit<SKUAttributes, 'id'> {}

class SKU extends Model<SKUAttributes, SKUCreationAttributes> {
  public id!: string;
  public productId!: string;
  public quantity!: number;
  public minimumStock!: number;
  public reorderPoint!: number;
}

SKU.init(
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
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    minimumStock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    reorderPoint: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: 'SKU',
  }
);

SKU.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

export default SKU; 