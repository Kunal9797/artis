'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the view that depends on currentStock column
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS dashboard_inventory_status CASCADE;');
  },

  down: async (queryInterface, Sequelize) => {
    // Recreate the view if rolling back
    // You'll need to add the original CREATE VIEW statement here
    // For now, we'll just leave it empty as we don't have the original definition
  }
};