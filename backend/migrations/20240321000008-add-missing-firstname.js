'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if firstName column exists
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Users' 
        AND column_name = 'firstName'
      `);

      // Only add if column doesn't exist
      if (columns.length === 0) {
        // Add as nullable first
        await queryInterface.addColumn('Users', 'firstName', {
          type: Sequelize.STRING,
          allowNull: true
        });

        // Update existing records
        await queryInterface.sequelize.query(`
          UPDATE "Users"
          SET "firstName" = CASE 
            WHEN username = 'admin' THEN 'Admin'
            ELSE username
          END
          WHERE "firstName" IS NULL
        `);

        // Make non-nullable
        await queryInterface.changeColumn('Users', 'firstName', {
          type: Sequelize.STRING,
          allowNull: false
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface) {
    // No down migration needed
    // We don't want to remove firstName if it exists
  }
}; 