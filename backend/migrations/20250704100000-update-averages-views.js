'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Drop existing view to recreate with parameters
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS recent_averages');
    
    // Create 3-month averages view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW recent_averages_3m AS
      SELECT 
        AVG(consumption) as avg_consumption,
        AVG(purchases) as avg_purchases
      FROM (
        SELECT 
          TO_CHAR(t.date, 'YYYY-MM') as month,
          SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as consumption,
          SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as purchases
        FROM "Transactions" t
        WHERE t.date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY TO_CHAR(t.date, 'YYYY-MM')
      ) recent_months
    `);
    
    // Create 4-month averages view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW recent_averages_4m AS
      SELECT 
        AVG(consumption) as avg_consumption,
        AVG(purchases) as avg_purchases
      FROM (
        SELECT 
          TO_CHAR(t.date, 'YYYY-MM') as month,
          SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as consumption,
          SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as purchases
        FROM "Transactions" t
        WHERE t.date >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY TO_CHAR(t.date, 'YYYY-MM')
      ) recent_months
    `);
    
    // Create default view pointing to 3-month for backwards compatibility
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW recent_averages AS
      SELECT * FROM recent_averages_3m
    `);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS recent_averages');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS recent_averages_3m');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS recent_averages_4m');
    
    // Recreate the original view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW recent_averages AS
      SELECT 
        AVG(consumption) as avg_consumption,
        AVG(purchases) as avg_purchases
      FROM (
        SELECT 
          TO_CHAR(t.date, 'YYYY-MM') as month,
          SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as consumption,
          SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as purchases
        FROM "Transactions" t
        WHERE t.date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY TO_CHAR(t.date, 'YYYY-MM')
      ) recent_months
    `);
  }
};