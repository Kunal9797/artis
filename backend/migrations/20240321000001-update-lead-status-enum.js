'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Create a temporary column
      await queryInterface.addColumn('Leads', 'status_new', {
        type: Sequelize.STRING
      });

      // 2. Copy data to the temporary column with new values
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_new = CASE 
          WHEN status = 'IN_PROGRESS' THEN 'FOLLOWUP'
          WHEN status = 'COMPLETED' THEN 'CLOSED'
          WHEN status = 'LOST' THEN 'CLOSED'
          ELSE status::text
        END;
      `);

      // 3. Drop the old status column and its enum
      await queryInterface.removeColumn('Leads', 'status');
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_Leads_status";`);

      // 4. Create new enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status" AS ENUM ('NEW', 'FOLLOWUP', 'NEGOTIATION', 'CLOSED');
      `);

      // 5. Add the new status column with the new enum
      await queryInterface.addColumn('Leads', 'status', {
        type: 'enum_Leads_status',
        allowNull: false,
        defaultValue: 'NEW'
      });

      // 6. Copy data from temporary column
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status = status_new::enum_Leads_status;
      `);

      // 7. Remove temporary column
      await queryInterface.removeColumn('Leads', 'status_new');

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // 1. Create a temporary column
      await queryInterface.addColumn('Leads', 'status_old', {
        type: Sequelize.STRING
      });

      // 2. Copy data to temporary column with old values
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_old = CASE 
          WHEN status = 'FOLLOWUP' THEN 'IN_PROGRESS'
          WHEN status = 'NEGOTIATION' THEN 'IN_PROGRESS'
          WHEN status = 'CLOSED' THEN 'COMPLETED'
          ELSE status::text
        END;
      `);

      // 3. Drop the current status column and its enum
      await queryInterface.removeColumn('Leads', 'status');
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_Leads_status";`);

      // 4. Create old enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'LOST');
      `);

      // 5. Add the status column with old enum
      await queryInterface.addColumn('Leads', 'status', {
        type: 'enum_Leads_status',
        allowNull: false,
        defaultValue: 'NEW'
      });

      // 6. Copy data from temporary column
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status = status_old::enum_Leads_status;
      `);

      // 7. Remove temporary column
      await queryInterface.removeColumn('Leads', 'status_old');

    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};