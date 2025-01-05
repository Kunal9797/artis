'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // First update null catalogs to empty array using proper PostgreSQL syntax
    await queryInterface.sequelize.query(`
      UPDATE "Products"
      SET "catalogs" = ARRAY[]::varchar[]
      WHERE "catalogs" IS NULL
    `);

    // Make catalogs non-nullable with default empty array
    await queryInterface.changeColumn('Products', 'catalogs', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: []
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Products', 'catalogs', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true
    });
  }
}; 