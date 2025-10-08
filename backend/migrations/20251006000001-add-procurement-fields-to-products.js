'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add procurement-related fields to Products table
    await queryInterface.addColumn('Products', 'leadTimeDays', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 10,
      comment: 'Lead time in days from order to delivery'
    });

    await queryInterface.addColumn('Products', 'safetyStockDays', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 15,
      comment: 'Safety stock in days of average consumption'
    });

    await queryInterface.addColumn('Products', 'reorderPoint', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Stock level at which to reorder (kg)'
    });

    await queryInterface.addColumn('Products', 'orderQuantity', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Optimal order quantity (kg)'
    });

    await queryInterface.addColumn('Products', 'isImported', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this design is imported (longer lead times)'
    });

    await queryInterface.addColumn('Products', 'lastOrderDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date of last purchase order'
    });

    await queryInterface.addColumn('Products', 'nextReorderDate', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Suggested next reorder date'
    });

    // Create indexes for performance
    await queryInterface.addIndex('Products', ['reorderPoint'], {
      name: 'idx_products_reorder_point'
    });

    await queryInterface.addIndex('Products', ['isImported'], {
      name: 'idx_products_is_imported'
    });

    await queryInterface.addIndex('Products', ['nextReorderDate'], {
      name: 'idx_products_next_reorder_date'
    });

    // Update lead times for imported products (if we can identify them)
    // This is a placeholder - you'll need to update based on actual supplier data
    await queryInterface.sequelize.query(`
      UPDATE "Products"
      SET "leadTimeDays" = 60
      WHERE "isImported" = true;
    `);

    // Calculate initial reorder points for all products
    // Reorder Point = (Avg Daily Consumption × Lead Time) + Safety Stock
    await queryInterface.sequelize.query(`
      UPDATE "Products"
      SET "reorderPoint" =
        CASE
          WHEN "avgConsumption" > 0 THEN
            (("avgConsumption" / 30) * "leadTimeDays") + (("avgConsumption" / 30) * "safetyStockDays")
          ELSE
            NULL
        END
      WHERE "deletedAt" IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('Products', 'idx_products_reorder_point');
    await queryInterface.removeIndex('Products', 'idx_products_is_imported');
    await queryInterface.removeIndex('Products', 'idx_products_next_reorder_date');

    // Remove columns
    await queryInterface.removeColumn('Products', 'leadTimeDays');
    await queryInterface.removeColumn('Products', 'safetyStockDays');
    await queryInterface.removeColumn('Products', 'reorderPoint');
    await queryInterface.removeColumn('Products', 'orderQuantity');
    await queryInterface.removeColumn('Products', 'isImported');
    await queryInterface.removeColumn('Products', 'lastOrderDate');
    await queryInterface.removeColumn('Products', 'nextReorderDate');
  }
};