const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('Products', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      artisCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      supplierCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      supplier: {
        type: DataTypes.STRING,
        allowNull: true
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true
      },
      gsm: {
        type: DataTypes.STRING,
        allowNull: true
      },
      texture: {
        type: DataTypes.STRING,
        allowNull: true
      },
      thickness: {
        type: DataTypes.STRING,
        allowNull: true
      },
      catalogs: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true
      },
      currentStock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      avgConsumption: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      minStockLevel: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Products');
  }
}; 