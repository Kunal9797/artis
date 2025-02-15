'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Create a temporary column with the new enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status_new" AS ENUM ('NEW', 'FOLLOWUP', 'NEGOTIATION', 'CLOSED');
      `);

      // 2. Add temporary column with new enum
      await queryInterface.addColumn('Leads', 'status_new', {
        type: 'enum_Leads_status_new',
        allowNull: true
      });

      // 3. Copy and convert data
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_new = CASE 
          WHEN status::text = 'IN_PROGRESS' THEN 'FOLLOWUP'::enum_Leads_status_new
          WHEN status::text = 'COMPLETED' THEN 'CLOSED'::enum_Leads_status_new
          WHEN status::text = 'LOST' THEN 'CLOSED'::enum_Leads_status_new
          ELSE status::text::enum_Leads_status_new
        END;
      `);

      // 4. Drop old column and type
      await queryInterface.removeColumn('Leads', 'status');
      await queryInterface.sequelize.query(`DROP TYPE "enum_Leads_status";`);

      // 5. Rename new type to old name
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Leads_status_new" RENAME TO "enum_Leads_status";
      `);

      // 6. Rename column and set constraints
      await queryInterface.renameColumn('Leads', 'status_new', 'status');
      await queryInterface.changeColumn('Leads', 'status', {
        type: 'enum_Leads_status',
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
          ELSE status::text::enum_Leads_status_old
        END;
      `);

      // 4. Drop new column and type
      await queryInterface.removeColumn('Leads', 'status');
      await queryInterface.sequelize.query(`DROP TYPE "enum_Leads_status";`);

      // 5. Rename old type
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Leads_status_old" RENAME TO "enum_Leads_status";
      `);

      // 6. Rename column and set constraints
      await queryInterface.renameColumn('Leads', 'status_old', 'status');
      await queryInterface.changeColumn('Leads', 'status', {
        type: 'enum_Leads_status',
        allowNull: false,
        defaultValue: 'NEW'
      });

    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};