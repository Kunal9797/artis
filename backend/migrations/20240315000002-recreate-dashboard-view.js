'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Recreate the dashboard view after the column type change
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW dashboard_inventory_status AS
      SELECT 
        p.id,
        p.productCode,
        p.name,
        p.category,
        p.thickness,
        p."currentStock",
        p."lastUpdated",
        CASE 
          WHEN p."currentStock" <= 0 THEN 'Out of Stock'
          WHEN p."currentStock" < 100 THEN 'Low Stock'
          ELSE 'In Stock'
        END as status
      FROM "Products" p
      WHERE p."deletedAt" IS NULL
      ORDER BY p."currentStock" ASC, p.name ASC;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS dashboard_inventory_status CASCADE;');
  }
};