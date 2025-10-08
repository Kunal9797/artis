'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ConsumptionForecasts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Product being forecasted'
      },
      forecastDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Date when forecast was generated'
      },
      forecastMonth: {
        type: Sequelize.STRING(7),
        allowNull: false,
        comment: 'Month being forecasted (YYYY-MM)'
      },
      predictedConsumption: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Predicted consumption in kg'
      },
      actualConsumption: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Actual consumption in kg (filled after month ends)'
      },
      forecastMethod: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'moving_average',
        comment: 'Method used: moving_average, exponential_smoothing, linear_trend, seasonal'
      },
      confidence: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Confidence level (0-100%)'
      },
      seasonalFactor: {
        type: Sequelize.DECIMAL(5, 3),
        allowNull: true,
        comment: 'Seasonal adjustment factor'
      },
      trendFactor: {
        type: Sequelize.DECIMAL(5, 3),
        allowNull: true,
        comment: 'Trend adjustment factor'
      },
      mape: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Mean Absolute Percentage Error (%)'
      },
      isBaseline: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the baseline forecast'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about the forecast'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who generated the forecast'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create indexes
    await queryInterface.addIndex('ConsumptionForecasts', ['productId'], {
      name: 'idx_forecasts_product_id'
    });

    await queryInterface.addIndex('ConsumptionForecasts', ['forecastMonth'], {
      name: 'idx_forecasts_month'
    });

    await queryInterface.addIndex('ConsumptionForecasts', ['forecastMethod'], {
      name: 'idx_forecasts_method'
    });

    // Unique constraint for baseline forecast per product per month
    await queryInterface.addIndex('ConsumptionForecasts',
      ['productId', 'forecastMonth', 'isBaseline'], {
        unique: true,
        where: { isBaseline: true },
        name: 'idx_unique_baseline_forecast'
      }
    );

    // Create a view for forecast accuracy metrics
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW forecast_accuracy AS
      SELECT
        cf."productId",
        p."artisCodes",
        p.supplier,
        p.category,
        COUNT(CASE WHEN cf."actualConsumption" IS NOT NULL THEN 1 END) as forecasts_with_actuals,
        AVG(cf.mape) as avg_mape,
        MIN(cf.mape) as best_mape,
        MAX(cf.mape) as worst_mape,
        AVG(cf.confidence) as avg_confidence,
        STRING_AGG(DISTINCT cf."forecastMethod", ', ') as methods_used
      FROM "ConsumptionForecasts" cf
      JOIN "Products" p ON cf."productId" = p.id
      WHERE cf."isBaseline" = true
      GROUP BY cf."productId", p."artisCodes", p.supplier, p.category;
    `);

    // Create a view for stockout risk assessment
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW stockout_risk AS
      SELECT
        p.id,
        p."artisCodes",
        p.name,
        p.supplier,
        p.category,
        p."currentStock",
        p."avgConsumption",
        p."leadTimeDays",
        p."reorderPoint",
        p."isImported",
        -- Days until stockout at average consumption
        CASE
          WHEN p."avgConsumption" > 0 THEN
            (p."currentStock" / (p."avgConsumption" / 30))::integer
          ELSE
            NULL
        END as days_until_stockout,
        -- Risk level
        CASE
          WHEN p."currentStock" <= 0 THEN 'STOCKOUT'
          WHEN p."currentStock" <= p."reorderPoint" THEN 'CRITICAL'
          WHEN p."currentStock" <= (p."reorderPoint" * 1.5) THEN 'LOW'
          WHEN p."avgConsumption" > 0 AND
               (p."currentStock" / (p."avgConsumption" / 30)) < (p."leadTimeDays" + p."safetyStockDays") THEN 'MEDIUM'
          ELSE 'SAFE'
        END as risk_level,
        -- Recommended order quantity
        CASE
          WHEN p."orderQuantity" IS NOT NULL THEN p."orderQuantity"
          WHEN p."avgConsumption" > 0 THEN (p."avgConsumption" * 2) -- 2 months supply
          ELSE NULL
        END as recommended_order_qty
      FROM "Products" p
      WHERE p."deletedAt" IS NULL;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop views
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS forecast_accuracy;');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS stockout_risk;');

    // Remove indexes
    await queryInterface.removeIndex('ConsumptionForecasts', 'idx_forecasts_product_id');
    await queryInterface.removeIndex('ConsumptionForecasts', 'idx_forecasts_month');
    await queryInterface.removeIndex('ConsumptionForecasts', 'idx_forecasts_method');
    await queryInterface.removeIndex('ConsumptionForecasts', 'idx_unique_baseline_forecast');

    // Drop the table
    await queryInterface.dropTable('ConsumptionForecasts');
  }
};