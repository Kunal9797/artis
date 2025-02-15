'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Create the new enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_leads_status_new AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');
      `);

      // 2. Add new column with new enum type
      await queryInterface.addColumn('Leads', 'status_updated', {
        type: 'enum_leads_status_new',
        allowNull: true
      });

      // 3. Map old values to new values
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_updated = CASE status
          WHEN 'NEW' THEN 'NEW'::enum_leads_status_new
          WHEN 'IN_PROGRESS' THEN 'CONTACTED'::enum_leads_status_new
          WHEN 'COMPLETED' THEN 'CLOSED_WON'::enum_leads_status_new
          WHEN 'LOST' THEN 'CLOSED_LOST'::enum_leads_status_new
          ELSE 'NEW'::enum_leads_status_new
        END;
      `);

      // 4. Drop old column
      await queryInterface.removeColumn('Leads', 'status');

      // 5. Rename new column to old name
      await queryInterface.renameColumn('Leads', 'status_updated', 'status');

      // 6. Set constraints
      await queryInterface.changeColumn('Leads', 'status', {
        type: 'enum_leads_status_new',
        allowNull: false,
        defaultValue: 'NEW'
      });

    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // 1. Create old enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_leads_status_old AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'LOST');
      `);

      // 2. Add temporary column
      await queryInterface.addColumn('Leads', 'status_old', {
        type: 'enum_leads_status_old',
        allowNull: true
      });

      // 3. Map new values back to old values
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_old = CASE status
          WHEN 'NEW' THEN 'NEW'::enum_leads_status_old
          WHEN 'CONTACTED' THEN 'IN_PROGRESS'::enum_leads_status_old
          WHEN 'QUALIFIED' THEN 'IN_PROGRESS'::enum_leads_status_old
          WHEN 'PROPOSAL' THEN 'IN_PROGRESS'::enum_leads_status_old
          WHEN 'NEGOTIATION' THEN 'IN_PROGRESS'::enum_leads_status_old
          WHEN 'CLOSED_WON' THEN 'COMPLETED'::enum_leads_status_old
          WHEN 'CLOSED_LOST' THEN 'LOST'::enum_leads_status_old
          ELSE 'NEW'::enum_leads_status_old
        END;
      `);

      // 4. Drop new column
      await queryInterface.removeColumn('Leads', 'status');

      // 5. Rename old column back
      await queryInterface.renameColumn('Leads', 'status_old', 'status');

      // 6. Set constraints
      await queryInterface.changeColumn('Leads', 'status', {
        type: 'enum_leads_status_old',
        allowNull: false,
        defaultValue: 'NEW'
      });

      // 7. Drop new enum type
      await queryInterface.sequelize.query(`DROP TYPE enum_leads_status_new;`);

    } catch (error) {
      console.error('Migration rollback error:', error);
      throw error;
    }
  }
};