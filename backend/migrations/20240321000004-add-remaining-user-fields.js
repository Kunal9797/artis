'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // 1. Add lastName column
      await queryInterface.addColumn('Users', 'lastName', {
        type: Sequelize.STRING,
        allowNull: true
      });

      // 2. Add phoneNumber column
      await queryInterface.addColumn('Users', 'phoneNumber', {
        type: Sequelize.STRING,
        allowNull: true
      });

      // 3. Update existing records with default values
      await queryInterface.sequelize.query(`
        UPDATE "Users"
        SET 
          "lastName" = CASE 
            WHEN username = 'admin' THEN 'Admin'
            ELSE 'User'
          END,
          "phoneNumber" = CASE 
            WHEN username = 'admin' THEN '0000000000'
            ELSE '0000000001'
          END
        WHERE "lastName" IS NULL OR "phoneNumber" IS NULL;
      `);

      // 4. Make columns non-nullable
      await queryInterface.changeColumn('Users', 'lastName', {
        type: Sequelize.STRING,
        allowNull: false
      });

      await queryInterface.changeColumn('Users', 'phoneNumber', {
        type: Sequelize.STRING,
        allowNull: false
      });

    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'lastName');
    await queryInterface.removeColumn('Users', 'phoneNumber');
  }
}; 