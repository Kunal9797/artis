const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    try {
      // Check if column already exists
      const tableInfo = await queryInterface.describeTable('Transactions');
      
      if (!tableInfo.operationId) {
        await queryInterface.addColumn('Transactions', 'operationId', {
          type: DataTypes.STRING,
          allowNull: true,
          after: 'includeInAvg'
        });
        console.log('Successfully added operationId column');
      } else {
        console.log('operationId column already exists');
      }
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Transactions', 'operationId');
  }
}; 