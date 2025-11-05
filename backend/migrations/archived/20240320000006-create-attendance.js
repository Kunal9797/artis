'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('Attendance', {
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
      date: {
        type: DataTypes.DATEONLY,
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
      status: {
        type: DataTypes.ENUM('PRESENT', 'ABSENT'),
        defaultValue: 'PRESENT',
        allowNull: false
      },
      checkInTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
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
    await queryInterface.addIndex('Attendance', ['salesTeamId']);
    await queryInterface.addIndex('Attendance', ['date']);
    await queryInterface.addIndex('Attendance', ['status']);
    
    // Add unique constraint to prevent multiple attendance records for same day
    await queryInterface.addConstraint('Attendance', {
      fields: ['salesTeamId', 'date'],
      type: 'unique',
      name: 'unique_attendance_per_day'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Attendance', ['salesTeamId']);
    await queryInterface.removeIndex('Attendance', ['date']);
    await queryInterface.removeIndex('Attendance', ['status']);
    await queryInterface.removeConstraint('Attendance', 'unique_attendance_per_day');
    await queryInterface.dropTable('Attendance');
  }
}; 