'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.changeColumn('Products', 'category', {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.changeColumn('Products', 'category', {
      type: DataTypes.STRING,
      allowNull: false
    });
  }
}; 