'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // 1. Add columns as nullable first
    await queryInterface.addColumn('Users', 'firstName', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'lastName', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Users', 'phoneNumber', {
      type: DataTypes.STRING,
      allowNull: true
    });

    // 2. Update existing records with default values
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET 
        "firstName" = 'Admin',
        "lastName" = 'User',
        "phoneNumber" = '0000000000'
      WHERE "firstName" IS NULL
    `);

    // 3. Now make the columns non-nullable
    await queryInterface.changeColumn('Users', 'firstName', {
      type: DataTypes.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('Users', 'lastName', {
      type: DataTypes.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('Users', 'phoneNumber', {
      type: DataTypes.STRING,
      allowNull: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'firstName');
    await queryInterface.removeColumn('Users', 'lastName');
    await queryInterface.removeColumn('Users', 'phoneNumber');
  }
}; 