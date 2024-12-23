import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

class Product extends Model {
  public id!: string;
  public artisCode!: string;
  public supplierCode?: string;
  public name!: string;
  public category?: string;
  public supplier?: string;
  public texture?: string;
  public thickness?: string;
  public designPaperId?: string;
  public designPaper?: Product;
  public gsm?: string;
  public catalogs?: string[];
  public altCode?: string;
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
    },
    altCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Groups related products across catalogs'
    }
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'Products'
  }
);

Product.belongsTo(Product, {
  as: 'designPaper',
  foreignKey: 'designPaperId'
});

export default Product; 