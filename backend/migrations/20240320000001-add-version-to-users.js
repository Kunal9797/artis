'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First add the version column
    await queryInterface.addColumn('Users', 'version', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false
    });

    // Then update all existing users to have version 1
    await queryInterface.sequelize.query(`
      UPDATE "Users" 
      SET version = 1 
      WHERE version IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'version');
  }
}; 