'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Drop the table and associated enum types
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "Leads" CASCADE;`);
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_leads_status CASCADE;`);
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_leads_status_new CASCADE;`);
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_leads_status_old CASCADE;`);
      
      // Create fresh table with new enum
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_leads_status AS ENUM (
          'NEW', 
          'CONTACTED', 
          'QUALIFIED', 
          'PROPOSAL', 
          'NEGOTIATION', 
          'CLOSED_WON', 
          'CLOSED_LOST'
        );
      `);

      // Create new Leads table
      await queryInterface.createTable('Leads', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        company: {
          type: Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: 'enum_leads_status',
          defaultValue: 'NEW',
          allowNull: false
        },
        notes: {
          type: Sequelize.TEXT,
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
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // In case we need to rollback
    await queryInterface.dropTable('Leads');
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_leads_status;`);
  }
}; 