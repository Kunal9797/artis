import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';

export interface SyncHistoryAttributes {
  id: string;
  syncBatchId: string;
  syncType: 'consumption' | 'purchases' | 'corrections' | 'initialStock';
  syncDate: Date;
  itemCount: number;
  status: 'completed' | 'failed' | 'undone';
  errors?: string;
  warnings?: string;
  metadata?: any;
  userId?: string;
}

export interface SyncHistoryCreationAttributes extends Omit<SyncHistoryAttributes, 'id'> {}

class SyncHistory extends Model<SyncHistoryAttributes, SyncHistoryCreationAttributes> 
  implements SyncHistoryAttributes {
  public id!: string;
  public syncBatchId!: string;
  public syncType!: 'consumption' | 'purchases' | 'corrections' | 'initialStock';
  public syncDate!: Date;
  public itemCount!: number;
  public status!: 'completed' | 'failed' | 'undone';
  public errors?: string;
  public warnings?: string;
  public metadata?: any;
  public userId?: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SyncHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    syncBatchId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    syncType: {
      type: DataTypes.ENUM('consumption', 'purchases', 'corrections', 'initialStock'),
      allowNull: false,
    },
    syncDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    itemCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('completed', 'failed', 'undone'),
      allowNull: false,
      defaultValue: 'completed',
    },
    errors: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    warnings: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'SyncHistory',
    tableName: 'SyncHistories',
    timestamps: true,
  }
);

export default SyncHistory;