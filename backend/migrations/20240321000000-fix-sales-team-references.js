'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Drop the empty SalesTeam table since SalesTeams already exists
      await queryInterface.dropTable('SalesTeam', { force: true });

      // 2. Add foreign key constraints pointing to SalesTeams (if they don't exist)
      await queryInterface.addConstraint('Leads', {
        fields: ['assignedTo'],
        type: 'foreign key',
        name: 'Leads_assignedTo_fkey_new',
        references: {
          table: 'SalesTeams',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      await queryInterface.addConstraint('Attendance', {
        fields: ['salesTeamId'],
        type: 'foreign key',
        name: 'Attendance_salesTeamId_fkey_new',
        references: {
          table: 'SalesTeams',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      await queryInterface.addConstraint('Messages', {
        fields: ['receiverId'],
        type: 'foreign key',
        name: 'Messages_receiverId_fkey_new',
        references: {
          table: 'SalesTeams',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove the new constraints
      await queryInterface.removeConstraint('Leads', 'Leads_assignedTo_fkey_new');
      await queryInterface.removeConstraint('Attendance', 'Attendance_salesTeamId_fkey_new');
      await queryInterface.removeConstraint('Messages', 'Messages_receiverId_fkey_new');

      // Recreate SalesTeam table
      await queryInterface.createTable('SalesTeam', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          }
        },
        role: {
          type: Sequelize.STRING,
          allowNull: false
        },
        territory: {
          type: Sequelize.STRING,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
}; 