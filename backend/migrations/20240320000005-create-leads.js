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
          model: 'SalesTeams',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assignedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false
      },
      notesHistory: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
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
    await queryInterface.addIndex('Leads', ['status']);
    await queryInterface.addIndex('Leads', ['assignedTo']);
    await queryInterface.addIndex('Leads', ['customerName']);
    await queryInterface.addIndex('Leads', ['phoneNumber']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Leads', ['status']);
    await queryInterface.removeIndex('Leads', ['assignedTo']);
    await queryInterface.removeIndex('Leads', ['customerName']);
    await queryInterface.removeIndex('Leads', ['phoneNumber']);
    await queryInterface.dropTable('Leads');
  }
}; 