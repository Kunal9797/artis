import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export enum InventoryType {
  DESIGN_PAPER_SHEET = 'DESIGN_PAPER_SHEET'
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
  public designPaperId?: string;
  public designPaper?: Product;
  public gsm?: string;
  public catalogs?: string[];
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
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
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
    designPaperId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Products',
        key: 'id'
      }
    },
    gsm: {
      type: DataTypes.STRING,
      allowNull: true
    },
    catalogs: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'Products',
    hooks: {
      beforeValidate: async (product: Product) => {
        // For design papers, these fields should always be undefined
        product.texture = undefined;
        product.thickness = undefined;
        product.designPaperId = undefined;
      }
    }
  }
);

Product.belongsTo(Product, {
  as: 'designPaper',
  foreignKey: 'designPaperId'
});

export default Product; 