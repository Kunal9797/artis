const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('Products', 'gsm', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Products', 'catalogs', {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Products', 'gsm');
    await queryInterface.removeColumn('Products', 'catalogs');
  }
}; 