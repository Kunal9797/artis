import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

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
  code: string;
  name: string;
  description?: string;
  category: string;
  inventoryType: InventoryType;
  measurementUnit: MeasurementUnit;
  quantity: number;
  minimumStock?: number;
  reorderPoint?: number;
}

interface SKUCreationAttributes extends Omit<SKUAttributes, 'id'> {}

class SKU extends Model<SKUAttributes, SKUCreationAttributes> {
  public id!: string;
  public code!: string;
  public name!: string;
  public description!: string;
  public category!: string;
  public inventoryType!: InventoryType;
  public measurementUnit!: MeasurementUnit;
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
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    inventoryType: {
      type: DataTypes.ENUM(...Object.values(InventoryType)),
      allowNull: false,
    },
    measurementUnit: {
      type: DataTypes.ENUM(...Object.values(MeasurementUnit)),
      allowNull: false,
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

export default SKU; 