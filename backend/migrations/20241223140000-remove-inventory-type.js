const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // Drop the inventory type column and its enum
    await queryInterface.sequelize.query(`
      ALTER TABLE "Products" DROP COLUMN IF EXISTS "inventoryType";
      DROP TYPE IF EXISTS "enum_Products_inventoryType";
    `);
  },

  async down(queryInterface) {
    // We don't need to restore as we're removing it permanently
    return Promise.resolve();
  }
}; 