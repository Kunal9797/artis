'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('Messages', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      receiverId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'SalesTeam',
          key: 'id'
        }
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('Messages', ['senderId']);
    await queryInterface.addIndex('Messages', ['receiverId']);
    await queryInterface.addIndex('Messages', ['isRead']);
    await queryInterface.addIndex('Messages', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Messages', ['senderId']);
    await queryInterface.removeIndex('Messages', ['receiverId']);
    await queryInterface.removeIndex('Messages', ['isRead']);
    await queryInterface.removeIndex('Messages', ['createdAt']);
    await queryInterface.dropTable('Messages');
  }
}; 