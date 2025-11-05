import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

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
  notes?: string;
  source: string;
  syncBatchId?: string;
  externalId?: string;
  formId?: string;
  formName?: string;
  metaSiteId?: string;
  phoneCountryCode?: string;
  formattedPhone?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ContactCreationAttributes extends Optional<ContactAttributes, 'id' | 'status' | 'isNew' | 'source' | 'externalId' | 'formId' | 'formName' | 'metaSiteId' | 'phoneCountryCode' | 'formattedPhone' | 'metadata' | 'createdAt' | 'updatedAt'> {}

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
  public notes?: string;
  public source!: string;
  public syncBatchId?: string;
  public externalId?: string;
  public formId?: string;
  public formName?: string;
  public metaSiteId?: string;
  public phoneCountryCode?: string;
  public formattedPhone?: string;
  public metadata?: any;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations removed - no longer using sales team

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

  // Sales team assignment removed - no longer used
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
    formId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    formName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metaSiteId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneCountryCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    formattedPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata from webhook',
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