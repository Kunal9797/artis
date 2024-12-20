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

class Product extends Model {
  public id!: string;
  public artisCode!: string;
  public supplierCode?: string;
  public name!: string;
  public category?: string;
  public supplier?: string;
  public texture?: string;
  public thickness?: string;
  public inventoryType!: InventoryType;
  public measurementUnit!: MeasurementUnit;
  public designPaperId?: string;
  public designPaper?: Product;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    artisCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    supplierCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    supplier: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    texture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    thickness: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    inventoryType: {
      type: DataTypes.ENUM(...Object.values(InventoryType)),
      allowNull: false,
    },
    measurementUnit: {
      type: DataTypes.ENUM(...Object.values(MeasurementUnit)),
      allowNull: false,
    },
    designPaperId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Products',
        key: 'id'
      }
    }
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'Products',
    hooks: {
      beforeValidate: async (product: Product) => {
        if (product.inventoryType === InventoryType.LAMINATE_SHEET) {
          if (product.designPaperId) {
            // Get the design paper and copy its category
            const designPaper = await Product.findByPk(product.designPaperId);
            if (designPaper) {
              product.category = designPaper.category;
            }
          }
          // Clear supplier fields
          product.supplierCode = undefined;
          product.supplier = undefined;
        } else if (product.inventoryType === InventoryType.DESIGN_PAPER_SHEET) {
          // For design papers, texture and thickness should be undefined
          product.texture = undefined;
          product.thickness = undefined;
          product.designPaperId = undefined;
        }
      }
    }
  }
);

Product.belongsTo(Product, {
  as: 'designPaper',
  foreignKey: 'designPaperId'
});

export default Product; 