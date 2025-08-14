import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import SalesTeam from './SalesTeam';

export enum ContactStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST'
}

interface ContactAttributes {
  id: string;
  submissionTime: Date;
  name: string;
  phone: string;
  interestedIn?: string;
  address?: string;
  query?: string;
  status: ContactStatus;
  isNew: boolean;
  assignedTo?: string;
  notes?: string;
  source: string;
  syncBatchId?: string;
  externalId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ContactCreationAttributes extends Optional<ContactAttributes, 'id' | 'status' | 'isNew' | 'source' | 'externalId' | 'createdAt' | 'updatedAt'> {}

class Contact extends Model<ContactAttributes, ContactCreationAttributes> implements ContactAttributes {
  public id!: string;
  public submissionTime!: Date;
  public name!: string;
  public phone!: string;
  public interestedIn?: string;
  public address?: string;
  public query?: string;
  public status!: ContactStatus;
  public isNew!: boolean;
  public assignedTo?: string;
  public notes?: string;
  public source!: string;
  public syncBatchId?: string;
  public externalId?: string;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public readonly salesTeam?: SalesTeam;

  // Helper method to mark as read
  public async markAsRead(): Promise<void> {
    await this.update({ isNew: false });
  }

  // Helper method to update status
  public async updateStatus(newStatus: ContactStatus, notes?: string): Promise<void> {
    const updates: any = { status: newStatus };
    
    if (notes) {
      const existingNotes = this.notes || '';
      const timestamp = new Date().toISOString();
      updates.notes = existingNotes + 
        `\n[${timestamp}] Status changed to ${newStatus}${notes ? ': ' + notes : ''}`;
    }
    
    await this.update(updates);
  }

  // Helper method to assign to sales team
  public async assignToSalesTeam(salesTeamId: string, notes?: string): Promise<void> {
    const updates: any = { assignedTo: salesTeamId };
    
    if (notes) {
      const existingNotes = this.notes || '';
      const timestamp = new Date().toISOString();
      updates.notes = existingNotes + 
        `\n[${timestamp}] Assigned to sales team${notes ? ': ' + notes : ''}`;
    }
    
    await this.update(updates);
  }
}

Contact.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    submissionTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    interestedIn: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    query: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ContactStatus)),
      defaultValue: ContactStatus.NEW,
      allowNull: false,
    },
    isNew: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'SalesTeams',
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      defaultValue: 'wix',
      allowNull: false,
    },
    syncBatchId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'External ID from Wix or other sources',
    },
  },
  {
    sequelize,
    modelName: 'Contact',
    tableName: 'Contacts',
    timestamps: true,
    indexes: [
      {
        fields: ['status'],
      },
      {
        fields: ['isNew'],
      },
      {
        fields: ['phone'],
      },
      {
        fields: ['submissionTime'],
      },
      {
        fields: ['assignedTo'],
      },
      {
        fields: ['syncBatchId'],
      },
      {
        unique: true,
        fields: ['phone'],
        where: {
          source: 'wix',
        },
      },
    ],
  }
);

export default Contact;