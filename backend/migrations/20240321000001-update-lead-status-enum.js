'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Create the new enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status_new" AS ENUM ('NEW', 'FOLLOWUP', 'NEGOTIATION', 'CLOSED');
      `);
      
      // 2. Add the new column with the new enum type
      await queryInterface.addColumn('Leads', 'status_new', {
        type: 'enum_Leads_status_new',
        allowNull: true
      });

      // 3. Copy data with mapping
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_new = CASE 
          WHEN status::text = 'IN_PROGRESS' THEN 'FOLLOWUP'::enum_Leads_status_new
          WHEN status::text = 'COMPLETED' THEN 'CLOSED'::enum_Leads_status_new
          WHEN status::text = 'LOST' THEN 'CLOSED'::enum_Leads_status_new
          WHEN status::text = 'NEW' THEN 'NEW'::enum_Leads_status_new
          END;
      `);

      // 4. Drop the old column (this will also drop the old enum type)
      await queryInterface.removeColumn('Leads', 'status');

      // 5. Rename the new column
      await queryInterface.renameColumn('Leads', 'status_new', 'status');

      // 6. Set not null constraint and default value
      await queryInterface.changeColumn('Leads', 'status', {
        type: 'enum_Leads_status_new',
        allowNull: false,
        defaultValue: 'NEW'
      });

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // 1. Create old enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status_old" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'LOST');
      `);

      // 2. Add temporary column
      await queryInterface.addColumn('Leads', 'status_old', {
        type: 'enum_Leads_status_old',
        allowNull: true
      });

      // 3. Copy and convert data back
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_old = CASE 
          WHEN status::text = 'FOLLOWUP' THEN 'IN_PROGRESS'::enum_Leads_status_old
          WHEN status::text = 'NEGOTIATION' THEN 'IN_PROGRESS'::enum_Leads_status_old
          WHEN status::text = 'CLOSED' THEN 'COMPLETED'::enum_Leads_status_old
          WHEN status::text = 'NEW' THEN 'NEW'::enum_Leads_status_old
          END;
      `);

      // 4. Drop new column
      await queryInterface.removeColumn('Leads', 'status');

      // 5. Rename old column
      await queryInterface.renameColumn('Leads', 'status_old', 'status');

      // 6. Set not null constraint and default value
      await queryInterface.changeColumn('Leads', 'status', {
        type: 'enum_Leads_status_old',
        allowNull: false,
        defaultValue: 'NEW'
      });

    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};