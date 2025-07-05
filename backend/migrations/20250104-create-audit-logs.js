'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('AuditLogs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      action: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entityType: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entityId: {
        type: Sequelize.STRING,
        allowNull: false
      },
      entityData: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      userName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      userRole: {
        type: Sequelize.STRING,
        allowNull: true
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('AuditLogs', ['entityType', 'entityId']);
    await queryInterface.addIndex('AuditLogs', ['userId']);
    await queryInterface.addIndex('AuditLogs', ['action']);
    await queryInterface.addIndex('AuditLogs', ['createdAt']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('AuditLogs');
  }
};