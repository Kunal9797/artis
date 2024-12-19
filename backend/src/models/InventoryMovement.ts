import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import SKU from './SKU';

export enum MovementType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  CONVERSION = 'CONVERSION'  // For tracking roll to sheet conversion
}

interface InventoryMovementAttributes {
  id: string;
  skuId: string;
  movementType: MovementType;
  quantity: number;
  fromSkuId?: string;  // For conversion tracking
  notes?: string;
  date: Date;
}

interface InventoryMovementCreationAttributes extends Omit<InventoryMovementAttributes, 'id'> {}

class InventoryMovement extends Model<InventoryMovementAttributes, InventoryMovementCreationAttributes> {
  public id!: string;
  public skuId!: string;
  public movementType!: MovementType;
  public quantity!: number;
  public fromSkuId?: string;
  public notes?: string;
  public date!: Date;
}

InventoryMovement.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    skuId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'SKUs',
        key: 'id'
      }
    },
    movementType: {
      type: DataTypes.ENUM(...Object.values(MovementType)),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    fromSkuId: {
      type: DataTypes.UUID,
      references: {
        model: 'SKUs',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    sequelize,
    modelName: 'InventoryMovement',
  }
);

export default InventoryMovement; 