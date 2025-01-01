import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import Product from './Product';

class Inventory extends Model {
  public id!: string;
  public productId!: string;
  public currentStock!: number;
  public lastUpdated!: Date;
  public minStockLevel?: number;
}

Inventory.init(
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
    currentStock: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      get() {
        const value = this.getDataValue('currentStock');
        return value ? Number(parseFloat(value).toFixed(2)) : 0;
      },
      set(value: number) {
        this.setDataValue('currentStock', Number(parseFloat(value.toString()).toFixed(2)));
      }
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    minStockLevel: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Inventory',
    tableName: 'Inventories'
  }
);

Inventory.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

export default Inventory; 