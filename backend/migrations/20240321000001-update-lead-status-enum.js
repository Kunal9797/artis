'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Log initial state
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'Leads';
      `);
      console.log('Current table structure:', columns);

      // Check current data
      const [data] = await queryInterface.sequelize.query(`
        SELECT status_new, COUNT(*) as count
        FROM "Leads"
        GROUP BY status_new;
      `);
      console.log('Current data distribution:', data);

      // Just need to set the constraints since the column already exists
      await queryInterface.changeColumn('Leads', 'status_new', {
        type: 'enum_Leads_status_new',
        allowNull: false,
        defaultValue: 'NEW'
      });
      console.log('Updated constraints on status_new column');

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // 1. Clean up any existing old enum type
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_leads_status_old') THEN
            DROP TYPE IF EXISTS "enum_Leads_status_old" CASCADE;
          END IF;
        END
        $$;
      `);

      // 2. Create old enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status_old" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'LOST');
      `);

      // 3. Add temporary column
      await queryInterface.addColumn('Leads', 'status_old', {
        type: 'enum_Leads_status_old',
        allowNull: true
      });

      // 4. Copy and convert data back
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_old = CASE 
          WHEN status::text = 'FOLLOWUP' THEN 'IN_PROGRESS'::enum_Leads_status_old
          WHEN status::text = 'NEGOTIATION' THEN 'IN_PROGRESS'::enum_Leads_status_old
          WHEN status::text = 'CLOSED' THEN 'COMPLETED'::enum_Leads_status_old
          WHEN status::text = 'NEW' THEN 'NEW'::enum_Leads_status_old
          END;
      `);

      // 5. Drop new column
      await queryInterface.removeColumn('Leads', 'status');

      // 6. Rename old column
      await queryInterface.renameColumn('Leads', 'status_old', 'status');

      // 7. Set not null constraint and default value
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