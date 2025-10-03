'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create distributor_orders table
    await queryInterface.createTable('distributor_orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      distributor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'distributors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      distributor_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Distributor name for reference, even if distributor_id is null'
      },
      location: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'City/location of the distributor'
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'State derived from location'
      },
      order_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of the order'
      },
      thickness_72_92: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Quantity for .72/.82/.92 mm thickness range'
      },
      thickness_08: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Quantity for 0.8 mm thickness (Woodrica/Artvio)'
      },
      thickness_1mm: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Quantity for 1 mm thickness (Artis)'
      },
      total_pieces: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total pieces (sum of all thicknesses)'
      },
      month_year: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Month and year in format "Month YYYY"'
      },
      quarter: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Quarter in format "Q1 2025"'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Any additional notes or comments'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('distributor_orders', ['distributor_id']);
    await queryInterface.addIndex('distributor_orders', ['location']);
    await queryInterface.addIndex('distributor_orders', ['order_date']);
    await queryInterface.addIndex('distributor_orders', ['month_year']);
    await queryInterface.addIndex('distributor_orders', ['distributor_name', 'location']);

    // Create a view for distributor order analytics
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW distributor_order_analytics AS
      SELECT
        distributor_name,
        location,
        state,
        COUNT(*) as total_orders,
        SUM(total_pieces) as total_volume,
        AVG(total_pieces) as avg_order_size,
        SUM(thickness_72_92) as total_thickness_72_92,
        SUM(thickness_08) as total_thickness_08,
        SUM(thickness_1mm) as total_thickness_1mm,
        MAX(order_date) as last_order_date,
        MIN(order_date) as first_order_date,
        CASE
          WHEN SUM(thickness_08) > SUM(thickness_1mm) AND SUM(thickness_08) > SUM(thickness_72_92) THEN '0.8mm'
          WHEN SUM(thickness_1mm) > SUM(thickness_08) AND SUM(thickness_1mm) > SUM(thickness_72_92) THEN '1mm'
          WHEN SUM(thickness_72_92) > 0 THEN '.72/.82/.92mm'
          ELSE 'Mixed'
        END as preferred_thickness
      FROM distributor_orders
      GROUP BY distributor_name, location, state
    `);

    // Create a view for monthly order trends
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW monthly_order_trends AS
      SELECT
        month_year,
        COUNT(DISTINCT distributor_name) as unique_distributors,
        COUNT(*) as total_orders,
        SUM(total_pieces) as total_volume,
        SUM(thickness_72_92) as thickness_72_92_total,
        SUM(thickness_08) as thickness_08_total,
        SUM(thickness_1mm) as thickness_1mm_total,
        AVG(total_pieces) as avg_order_size
      FROM distributor_orders
      WHERE month_year IS NOT NULL
      GROUP BY month_year
      ORDER BY MIN(order_date) DESC
    `);

    console.log('✅ Created distributor_orders table and analytics views');
  },

  async down(queryInterface, Sequelize) {
    // Drop views first
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS monthly_order_trends');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS distributor_order_analytics');

    // Drop the table
    await queryInterface.dropTable('distributor_orders');

    console.log('✅ Dropped distributor_orders table and related views');
  }
};