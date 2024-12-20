const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // First add all columns as nullable
    await queryInterface.addColumn('Products', 'artisCode', {
      type: DataTypes.STRING,
      allowNull: true, // temporarily allow null
    });

    // Update existing records to use their 'code' value as 'artisCode'
    await queryInterface.sequelize.query(`
      UPDATE "Products" 
      SET "artisCode" = code 
      WHERE "artisCode" IS NULL;
    `);

    // Now make artisCode non-nullable and unique
    await queryInterface.changeColumn('Products', 'artisCode', {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    });

    // Add remaining columns
    await queryInterface.addColumn('Products', 'supplierCode', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Products', 'supplier', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Products', 'texture', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Products', 'thickness', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Products', 'artisCode');
    await queryInterface.removeColumn('Products', 'supplierCode');
    await queryInterface.removeColumn('Products', 'supplier');
    await queryInterface.removeColumn('Products', 'texture');
    await queryInterface.removeColumn('Products', 'thickness');
  }
};