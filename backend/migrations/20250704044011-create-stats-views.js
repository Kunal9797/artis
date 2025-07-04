'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create monthly stats view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW monthly_stats AS
      SELECT 
        TO_CHAR(t.date, 'YYYY-MM') as month_sort,
        TO_CHAR(t.date, 'Mon YYYY') as month_display,
        p.thickness,
        p.supplier,
        p.category,
        SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END) as consumption,
        SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END) as purchases,
        COUNT(DISTINCT CASE WHEN t.type = 'OUT' THEN t.id END) as consumption_count,
        COUNT(DISTINCT CASE WHEN t.type = 'IN' THEN t.id END) as purchase_count
      FROM "Transactions" t
      INNER JOIN "Products" p ON t."productId" = p.id
      GROUP BY 
        TO_CHAR(t.date, 'YYYY-MM'),
        TO_CHAR(t.date, 'Mon YYYY'),
        p.thickness,
        p.supplier,
        p.category
    `);

    // Create indexes for better performance
    await queryInterface.addIndex('Transactions', ['date'], {
      name: 'idx_monthly_stats_month'
    });
    
    await queryInterface.addIndex('Products', ['thickness'], {
      name: 'idx_monthly_stats_thickness'
    });
    
    await queryInterface.addIndex('Products', ['supplier'], {
      name: 'idx_monthly_stats_supplier'
    });
    
    await queryInterface.addIndex('Products', ['category'], {
      name: 'idx_monthly_stats_category'
    });

    // Create product summary view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW product_summary AS
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        SUM(p."currentStock") as total_stock,
        AVG(p."avgConsumption") as avg_consumption,
        COUNT(DISTINCT p.supplier) as total_suppliers,
        COUNT(DISTINCT p.category) as total_categories
      FROM "Products" p
    `);

    // Create supplier stats view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW supplier_stats AS
      SELECT 
        p.supplier,
        COUNT(DISTINCT p.id) as product_count,
        SUM(p."currentStock") as total_stock,
        AVG(p."avgConsumption") as avg_consumption,
        (
          SELECT SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END)
          FROM "Transactions" t 
          WHERE t."productId" IN (SELECT id FROM "Products" WHERE supplier = p.supplier)
        ) as total_consumption,
        (
          SELECT SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END)
          FROM "Transactions" t 
          WHERE t."productId" IN (SELECT id FROM "Products" WHERE supplier = p.supplier)
        ) as total_purchases
      FROM "Products" p
      WHERE p.supplier IS NOT NULL
      GROUP BY p.supplier
    `);

    // Create category stats view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW category_stats AS
      SELECT 
        p.category,
        COUNT(DISTINCT p.id) as product_count,
        SUM(p."currentStock") as total_stock,
        AVG(p."avgConsumption") as avg_consumption,
        (
          SELECT SUM(CASE WHEN t.type = 'OUT' THEN t.quantity ELSE 0 END)
          FROM "Transactions" t 
          WHERE t."productId" IN (SELECT id FROM "Products" WHERE category = p.category)
        ) as total_consumption,
        (
          SELECT SUM(CASE WHEN t.type = 'IN' THEN t.quantity ELSE 0 END)
          FROM "Transactions" t 
          WHERE t."productId" IN (SELECT id FROM "Products" WHERE category = p.category)
        ) as total_purchases
      FROM "Products" p
      WHERE p.category IS NOT NULL
      GROUP BY p.category
    `);

    // Create recent averages view
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
  },

  async down (queryInterface, Sequelize) {
    // Drop views
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS recent_averages');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS category_stats');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS supplier_stats');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS product_summary');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS monthly_stats');
    
    // Drop indexes
    await queryInterface.removeIndex('Transactions', 'idx_monthly_stats_month');
    await queryInterface.removeIndex('Products', 'idx_monthly_stats_thickness');
    await queryInterface.removeIndex('Products', 'idx_monthly_stats_supplier');
    await queryInterface.removeIndex('Products', 'idx_monthly_stats_category');
  }
};