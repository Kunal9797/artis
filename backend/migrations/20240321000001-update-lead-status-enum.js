'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Drop the new enum type if it exists from a previous failed migration
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "enum_Leads_status_new";
      `);

      // 2. Create a new enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status_new" AS ENUM ('NEW', 'FOLLOWUP', 'NEGOTIATION', 'CLOSED');
      `);

      // 3. Update existing data to match new enum values
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status = CASE 
          WHEN status = 'IN_PROGRESS' THEN 'FOLLOWUP'
          WHEN status = 'COMPLETED' THEN 'CLOSED'
          WHEN status = 'LOST' THEN 'CLOSED'
          ELSE status
        END;
      `);

      // 4. Drop the default value first
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads" 
        ALTER COLUMN status DROP DEFAULT;
      `);

      // 5. Alter the column to use the new enum
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads" 
        ALTER COLUMN status TYPE "enum_Leads_status_new" 
        USING status::text::"enum_Leads_status_new";
      `);

      // 6. Set the new default value
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads" 
        ALTER COLUMN status SET DEFAULT 'NEW'::"enum_Leads_status_new";
      `);

      // 7. Drop the old enum type
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "enum_Leads_status";
      `);

      // 8. Rename the new enum type to the original name
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Leads_status_new" 
        RENAME TO "enum_Leads_status";
      `);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // 1. Drop the new enum type if it exists
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "enum_Leads_status_old";
      `);

      // 2. Create the old enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status_old" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'LOST');
      `);

      // 3. Update the data
      await queryInterface.sequelize.query(`
        UPDATE "Leads"
        SET status = CASE 
          WHEN status = 'FOLLOWUP' THEN 'IN_PROGRESS'
          WHEN status = 'NEGOTIATION' THEN 'IN_PROGRESS'
          WHEN status = 'CLOSED' THEN 'COMPLETED'
          ELSE status
        END;
      `);

      // 4. Drop the default value first
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads" 
        ALTER COLUMN status DROP DEFAULT;
      `);

      // 5. Alter the column type
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads" 
        ALTER COLUMN status TYPE "enum_Leads_status_old" 
        USING status::text::"enum_Leads_status_old";
      `);

      // 6. Set the new default value
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads" 
        ALTER COLUMN status SET DEFAULT 'NEW'::"enum_Leads_status_old";
      `);

      // 7. Drop the current enum type
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "enum_Leads_status";
      `);

      // 8. Rename the old enum type to the original name
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_Leads_status_old" 
        RENAME TO "enum_Leads_status";
      `);
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
}; 