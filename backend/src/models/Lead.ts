import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import User from './User';
import SalesTeam from './SalesTeam';

export enum LeadStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  LOST = 'LOST',
}

interface LeadAttributes {
  id: string;
  customerName: string;
  phoneNumber: string;
  enquiryDetails: string;
  status: LeadStatus;
  assignedTo: string;
  assignedBy: string;
  notes: string;
}

interface LeadCreationAttributes extends Omit<LeadAttributes, 'id'> {}

class Lead extends Model<LeadAttributes, LeadCreationAttributes> {
  public id!: string;
  public customerName!: string;
  public phoneNumber!: string;
  public enquiryDetails!: string;
  public status!: LeadStatus;
  public assignedTo!: string;
  public assignedBy!: string;
  public notes!: string;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to reassign lead
  public async reassign(newAssigneeId: string, assignedBy: string): Promise<void> {
    const oldAssigneeId = this.assignedTo;
    await this.update({
      assignedTo: newAssigneeId,
      assignedBy,
      notes: this.notes + `\nReassigned from ${oldAssigneeId} to ${newAssigneeId} by ${assignedBy} on ${new Date().toISOString()}`
    });
  }
}

Lead.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^\+?[\d\s-]+$/,  // Basic phone number validation
      },
    },
    enquiryDetails: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(LeadStatus)),
      defaultValue: LeadStatus.NEW,
      allowNull: false,
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: SalesTeam,
        key: 'id',
      },
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Lead',
    timestamps: true,
    hooks: {
      beforeUpdate: async (lead: Lead) => {
        // Add timestamp to notes when status changes
        if (lead.changed('status')) {
          const timestamp = new Date().toISOString();
          lead.notes = `${lead.notes || ''}\nStatus changed to ${lead.status} on ${timestamp}`;
        }
      },
    },
  }
);

// Define associations
Lead.belongsTo(SalesTeam, { as: 'assignee', foreignKey: 'assignedTo' });
Lead.belongsTo(User, { as: 'assigner', foreignKey: 'assignedBy' });

export default Lead; 