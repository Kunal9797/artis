import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/sequelize';
import User from './User';
import SalesTeam from './SalesTeam';

interface MessageAttributes {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
}

interface MessageCreationAttributes extends Omit<MessageAttributes, 'id'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes> {
  public id!: string;
  public senderId!: string;
  public receiverId!: string;
  public message!: string;
  public isRead!: boolean;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to mark message as read
  public async markAsRead(): Promise<void> {
    await this.update({ isRead: true });
  }
}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: SalesTeam,
        key: 'id',
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Message',
    timestamps: true,
    indexes: [
      {
        fields: ['senderId'],
      },
      {
        fields: ['receiverId'],
      },
    ],
  }
);

// Define associations
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(SalesTeam, { as: 'receiver', foreignKey: 'receiverId' });

User.hasMany(Message, { as: 'sentMessages', foreignKey: 'senderId' });
SalesTeam.hasMany(Message, { as: 'receivedMessages', foreignKey: 'receiverId' });

export default Message; 