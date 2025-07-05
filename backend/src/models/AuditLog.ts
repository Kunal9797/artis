import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';

class AuditLog extends Model {
  public id!: string;
  public action!: string;
  public entityType!: string;
  public entityId!: string;
  public entityData?: any;
  public userId!: string;
  public userName!: string;
  public userRole?: string;
  public reason?: string;
  public ipAddress?: string;
  public userAgent?: string;
  public createdAt!: Date;
}

AuditLog.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entityData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userRole: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'AuditLog',
  tableName: 'AuditLogs',
  updatedAt: false
});

export default AuditLog;