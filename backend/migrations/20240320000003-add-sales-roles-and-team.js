'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // 1. Add new roles to User role enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'SALES_EXECUTIVE';
      ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'ZONAL_HEAD';
      ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'COUNTRY_HEAD';
    `);

    // 2. Create SalesTeam table
    await queryInterface.createTable('SalesTeam', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      reportingTo: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'SalesTeam',
          key: 'id'
        }
      },
      territory: {
        type: DataTypes.STRING,
        allowNull: false
      },
      targetQuarter: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      targetYear: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      targetAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
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
    await queryInterface.addIndex('SalesTeam', ['territory']);
    await queryInterface.addIndex('SalesTeam', ['reportingTo']);
    await queryInterface.addIndex('SalesTeam', ['userId'], { unique: true });

    // Add constraint for target amount
    await queryInterface.sequelize.query(`
      ALTER TABLE "SalesTeam" 
      ADD CONSTRAINT check_target_amount 
      CHECK ("targetAmount" >= 0)
    `);
  },

  async down(queryInterface) {
    // Remove indexes and constraints first
    await queryInterface.removeIndex('SalesTeam', ['territory']);
    await queryInterface.removeIndex('SalesTeam', ['reportingTo']);
    await queryInterface.removeIndex('SalesTeam', ['userId']);
    
    // Drop the table
    await queryInterface.dropTable('SalesTeam');

    // Remove the enum values
    // Note: Postgres doesn't support removing enum values directly
    // We'd need to create a new enum type in production
  }
}; 