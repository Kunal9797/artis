const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('Products', 'designPaperId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Products',
        key: 'id'
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Products', 'designPaperId');
  }
};