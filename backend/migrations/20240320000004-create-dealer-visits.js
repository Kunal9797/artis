'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('DealerVisits', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      salesTeamId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'SalesTeam',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      dealerName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      location: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          hasCoordinates(value) {
            if (!value.latitude || !value.longitude) {
              throw new Error('Location must include latitude and longitude');
            }
          }
        }
      },
      visitDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      photoUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      salesAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      isOfflineEntry: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
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
    await queryInterface.addIndex('DealerVisits', ['salesTeamId']);
    await queryInterface.addIndex('DealerVisits', ['visitDate']);
    await queryInterface.addIndex('DealerVisits', ['dealerName']);

    // Add constraint for sales amount
    await queryInterface.sequelize.query(`
      ALTER TABLE "DealerVisits" 
      ADD CONSTRAINT check_sales_amount 
      CHECK ("salesAmount" >= 0)
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('DealerVisits', ['salesTeamId']);
    await queryInterface.removeIndex('DealerVisits', ['visitDate']);
    await queryInterface.removeIndex('DealerVisits', ['dealerName']);
    await queryInterface.dropTable('DealerVisits');
  }
}; 