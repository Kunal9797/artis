const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn('Products', 'code');
  },

  async down(queryInterface) {
    await queryInterface.addColumn('Products', 'code', {
      type: DataTypes.STRING,
      allowNull: false
    });
  }
}; 