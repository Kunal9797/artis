const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // Remove unnecessary columns
    await queryInterface.removeColumn('Products', 'measurementUnit');
    await queryInterface.removeColumn('Products', 'texture');
    await queryInterface.removeColumn('Products', 'thickness');
    await queryInterface.removeColumn('Products', 'designPaperId');
    
    // Update inventory type enum to only have DESIGN_PAPER_SHEET
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Products_inventoryType" RENAME TO "enum_Products_inventoryType_old";
      CREATE TYPE "enum_Products_inventoryType" AS ENUM ('DESIGN_PAPER_SHEET');
      ALTER TABLE "Products" ALTER COLUMN "inventoryType" TYPE "enum_Products_inventoryType" 
      USING "inventoryType"::text::"enum_Products_inventoryType";
      DROP TYPE "enum_Products_inventoryType_old";
    `);
  },

  async down(queryInterface) {
    // We don't need to restore these columns as they're being removed permanently
    return Promise.resolve();
  }
}; 