'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First drop the Leads table to remove dependencies
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "Leads" CASCADE;`);
      
      // Drop all lead status enum types
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          DROP TYPE IF EXISTS enum_leads_status CASCADE;
          DROP TYPE IF EXISTS enum_Leads_status CASCADE;
          DROP TYPE IF EXISTS enum_leads_status_new CASCADE;
          DROP TYPE IF EXISTS enum_leads_status_old CASCADE;
        EXCEPTION
          WHEN others THEN null;
        END $$;
      `);

      // Create the single correct enum type
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

      // Recreate the Leads table
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
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });

    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Simple reversion - just drop everything
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "Leads" CASCADE;`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS enum_leads_status CASCADE;`);
  }
}; 