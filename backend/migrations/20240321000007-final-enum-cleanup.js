'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Convert to TEXT first
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads" 
        ALTER COLUMN status TYPE TEXT 
        USING status::TEXT;

        ALTER TABLE "Attendance" 
        ALTER COLUMN status TYPE TEXT 
        USING status::TEXT;
      `);

      // 2. Drop ALL enums
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS "enum_Leads_status" CASCADE;
        DROP TYPE IF EXISTS "enum_Attendances_status" CASCADE;
        DROP TYPE IF EXISTS "enum_Attendance_status" CASCADE;
      `);

      // 3. Create clean enums
      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_Leads_status" AS ENUM (
          'NEW',
          'CONTACTED',
          'QUALIFIED',
          'PROPOSAL',
          'NEGOTIATION',
          'CLOSED_WON',
          'CLOSED_LOST'
        );

        CREATE TYPE "enum_Attendance_status" AS ENUM (
          'PRESENT',
          'ABSENT'
        );
      `);

      // 4. Convert back with clean mapping
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads"
        ALTER COLUMN status TYPE "enum_Leads_status"
        USING (
          CASE status
            WHEN 'FOLLOWUP' THEN 'CONTACTED'
            WHEN 'CLOSED' THEN 'CLOSED_LOST'
            ELSE status
          END
        )::"enum_Leads_status";

        ALTER TABLE "Attendance"
        ALTER COLUMN status TYPE "enum_Attendance_status"
        USING status::"enum_Attendance_status";
      `);

      // 5. Set defaults and constraints
      await queryInterface.sequelize.query(`
        ALTER TABLE "Leads"
        ALTER COLUMN status SET DEFAULT 'NEW',
        ALTER COLUMN status SET NOT NULL;

        ALTER TABLE "Attendance"
        ALTER COLUMN status SET DEFAULT 'PRESENT',
        ALTER COLUMN status SET NOT NULL;
      `);

    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Convert back to text in case we need to rollback
    await queryInterface.sequelize.query(`
      ALTER TABLE "Leads"
      ALTER COLUMN status TYPE TEXT
      USING status::TEXT;

      ALTER TABLE "Attendance"
      ALTER COLUMN status TYPE TEXT
      USING status::TEXT;
    `);
  }
}; 