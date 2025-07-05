'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add soft delete columns
      await queryInterface.addColumn('Products', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('Products', 'deletedBy', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('Products', 'deletionReason', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });
      
      // Add index for better performance when filtering non-deleted products
      await queryInterface.addIndex('Products', ['deletedAt'], {
        name: 'products_deleted_at_idx',
        transaction
      });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      await queryInterface.removeIndex('Products', 'products_deleted_at_idx', { transaction });
      await queryInterface.removeColumn('Products', 'deletedAt', { transaction });
      await queryInterface.removeColumn('Products', 'deletedBy', { transaction });
      await queryInterface.removeColumn('Products', 'deletionReason', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};