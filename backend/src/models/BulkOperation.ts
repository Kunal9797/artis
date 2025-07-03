import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface BulkOperationAttributes {
  id: string;
  type: 'inventory' | 'consumption' | 'purchase' | 'correction';
  uploadedBy?: string;
  uploadedAt: Date;
  fileName: string;
  monthStart?: Date;
  monthEnd?: Date;
  recordsTotal: number;
  recordsProcessed: number;
  recordsFailed: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  errorLog?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BulkOperationCreationAttributes extends Optional<BulkOperationAttributes, 
  'id' | 'uploadedAt' | 'recordsTotal' | 'recordsProcessed' | 'recordsFailed' | 'status' | 'createdAt' | 'updatedAt'> {}

class BulkOperation extends Model<BulkOperationAttributes, BulkOperationCreationAttributes> 
  implements BulkOperationAttributes {
  public id!: string;
  public type!: 'inventory' | 'consumption' | 'purchase' | 'correction';
  public uploadedBy?: string;
  public uploadedAt!: Date;
  public fileName!: string;
  public monthStart?: Date;
  public monthEnd?: Date;
  public recordsTotal!: number;
  public recordsProcessed!: number;
  public recordsFailed!: number;
  public status!: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  public errorLog?: string;
  public metadata?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BulkOperation.init({
  id: {
    type: DataTypes.STRING,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('inventory', 'consumption', 'purchase', 'correction'),
    allowNull: false
  },
  uploadedBy: {
    type: DataTypes.UUID,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  monthStart: {
    type: DataTypes.DATE
  },
  monthEnd: {
    type: DataTypes.DATE
  },
  recordsTotal: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  recordsProcessed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  recordsFailed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'partial'),
    defaultValue: 'pending'
  },
  errorLog: {
    type: DataTypes.TEXT
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'BulkOperation',
  tableName: 'BulkOperations',
  timestamps: true
});

export default BulkOperation;