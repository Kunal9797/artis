'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, let's log the current state
      const [enums] = await queryInterface.sequelize.query(`
        SELECT t.typname, e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname LIKE 'enum_leads_status%';
      `);
      console.log('Current enum types:', enums);

      // Check table structure
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'Leads';
      `);
      console.log('Current table structure:', columns);

      // Check existing data
      const [data] = await queryInterface.sequelize.query(`
        SELECT status, COUNT(*) as count
        FROM "Leads"
        GROUP BY status;
      `);
      console.log('Current data distribution:', data);

      // Now proceed with migration steps
      console.log('Starting migration steps...');

      // 1. Drop existing enum if exists
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_leads_status_new') THEN
            RAISE NOTICE 'Dropping existing enum_leads_status_new';
            DROP TYPE IF EXISTS "enum_Leads_status_new" CASCADE;
          END IF;
        END
        $$;
      `);
      console.log('Step 1: Cleaned up existing enum');

      // 2. Create new enum
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status_new" AS ENUM ('NEW', 'FOLLOWUP', 'NEGOTIATION', 'CLOSED');
      `);
      console.log('Step 2: Created new enum type');

      // 3. Add new column
      await queryInterface.addColumn('Leads', 'status_new', {
        type: 'enum_Leads_status_new',
        allowNull: true
      });
      console.log('Step 3: Added new column');

      // 4. Copy data
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status_new = CASE 
          WHEN status::text = 'IN_PROGRESS' THEN 'FOLLOWUP'::enum_Leads_status_new
          WHEN status::text = 'COMPLETED' THEN 'CLOSED'::enum_Leads_status_new
          WHEN status::text = 'LOST' THEN 'CLOSED'::enum_Leads_status_new
          WHEN status::text = 'NEW' THEN 'NEW'::enum_Leads_status_new
          END;
      `);
      console.log('Step 4: Copied data to new column');

      // Log data state after copy
      const [newData] = await queryInterface.sequelize.query(`
        SELECT status, status_new, COUNT(*) as count
        FROM "Leads"
        GROUP BY status, status_new;
      `);
      console.log('Data state after copy:', newData);

      // 5. Drop old column
      await queryInterface.removeColumn('Leads', 'status');
      console.log('Step 5: Dropped old column');

      // 6. Rename column
      await queryInterface.renameColumn('Leads', 'status_new', 'status');
      console.log('Step 6: Renamed new column');

      // 7. Set constraints
      await queryInterface.changeColumn('Leads', 'status', {
        type: 'enum_Leads_status_new',
        allowNull: false,
        defaultValue: 'NEW'
      });
      console.log('Step 7: Set constraints');

      // Final state check
      const [finalState] = await queryInterface.sequelize.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'Leads';
      `);
      console.log('Final table structure:', finalState);

    } catch (error) {
      console.error('Migration failed at step:', error.message);
      console.error('Full error:', error);
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