const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('Transactions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: DataTypes.ENUM('IN', 'OUT'),
        allowNull: false
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true
      },
      includeInAvg: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    await queryInterface.dropTable('Transactions');
  }
}; 