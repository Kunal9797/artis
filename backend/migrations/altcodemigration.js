const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('Products', 'altCode', {
      type: DataTypes.STRING,
      allowNull: true
    });

    // Set altCode to supplierCode for existing records
    await queryInterface.sequelize.query(`
      UPDATE "Products" 
      SET "altCode" = "supplierCode" 
      WHERE "altCode" IS NULL AND "supplierCode" IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Products', 'altCode');
  }
};