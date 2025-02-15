import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import User from './User';
import SalesTeam from './SalesTeam';

export enum LeadStatus {
  NEW = 'NEW',
  FOLLOWUP = 'FOLLOWUP',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED = 'CLOSED'
}

interface NoteEntry {
  timestamp: string;
  note: string;
  author: string;
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
  location: string;
  notesHistory: NoteEntry[];
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
  public location!: string;
  public notesHistory!: NoteEntry[];

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to reassign lead
  public async reassign(newAssigneeId: string, assignedBy: string): Promise<void> {
    const oldAssigneeId = this.assignedTo;
    const noteEntry: NoteEntry = {
      timestamp: new Date().toISOString(),
      note: `Reassigned from ${oldAssigneeId} to ${newAssigneeId}`,
      author: assignedBy
    };

    await this.update({
      assignedTo: newAssigneeId,
      assignedBy,
      notesHistory: [...(this.notesHistory || []), noteEntry]
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
        is: /^\+?[1-9][0-9]{7,14}$/,  // Updated phone validation
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
        model: 'SalesTeams',
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
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    notesHistory: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'Lead',
    tableName: 'Leads',
    timestamps: true,
    hooks: {
      beforeUpdate: async (lead: Lead) => {
        // Add timestamp to notes when status changes
        if (lead.changed('status')) {
          const noteEntry: NoteEntry = {
            timestamp: new Date().toISOString(),
            note: `Status changed to ${lead.status}`,
            author: lead.assignedBy
          };
          lead.notesHistory = [...(lead.notesHistory || []), noteEntry];
        }
      },
    },
  }
);

export default Lead; 