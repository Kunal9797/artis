'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First add the column as nullable
      await queryInterface.addColumn('Users', 'firstName', {
        type: Sequelize.STRING,
        allowNull: true  // Make it nullable first
      });

      // Set a default value for existing records
      await queryInterface.sequelize.query(`
        UPDATE "Users" 
        SET "firstName" = 'User' 
        WHERE "firstName" IS NULL;
      `);

      // Then make it non-nullable if needed
      await queryInterface.changeColumn('Users', 'firstName', {
        type: Sequelize.STRING,
        allowNull: false
      });
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'firstName');
  }
}; 