'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('Leads', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false
      },
      enquiryDetails: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('NEW', 'IN_PROGRESS', 'COMPLETED', 'LOST'),
        defaultValue: 'NEW',
        allowNull: false
      },
      assignedTo: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'SalesTeam',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      assignedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('Leads', ['assignedTo']);
    await queryInterface.addIndex('Leads', ['status']);
    await queryInterface.addIndex('Leads', ['phoneNumber']);
    await queryInterface.addIndex('Leads', ['createdAt']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Leads', ['assignedTo']);
    await queryInterface.removeIndex('Leads', ['status']);
    await queryInterface.removeIndex('Leads', ['phoneNumber']);
    await queryInterface.removeIndex('Leads', ['createdAt']);
    await queryInterface.dropTable('Leads');
  }
}; 