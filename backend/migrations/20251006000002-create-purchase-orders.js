'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PurchaseOrders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique purchase order number'
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Product being ordered'
      },
      supplier: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Supplier name'
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Order quantity in kg'
      },
      unitPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Price per kg'
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Total order amount'
      },
      orderDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Date order was placed'
      },
      expectedDeliveryDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Expected delivery date based on lead time'
      },
      actualDeliveryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Actual delivery date when received'
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the order'
      },
      leadTimeDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Expected lead time in days'
      },
      actualLeadTimeDays: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Actual lead time in days (calculated after delivery)'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about the order'
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
        comment: 'User who created the order'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who approved the order'
      },
      approvalDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date order was approved'
      },
      trackingNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Shipment tracking number'
      },
      invoiceNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Supplier invoice number'
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
    await queryInterface.addIndex('PurchaseOrders', ['productId'], {
      name: 'idx_purchase_orders_product_id'
    });

    await queryInterface.addIndex('PurchaseOrders', ['supplier'], {
      name: 'idx_purchase_orders_supplier'
    });

    await queryInterface.addIndex('PurchaseOrders', ['status'], {
      name: 'idx_purchase_orders_status'
    });

    await queryInterface.addIndex('PurchaseOrders', ['orderDate'], {
      name: 'idx_purchase_orders_order_date'
    });

    await queryInterface.addIndex('PurchaseOrders', ['expectedDeliveryDate'], {
      name: 'idx_purchase_orders_expected_delivery'
    });

    // Create a view for supplier performance metrics
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW supplier_performance AS
      SELECT
        supplier,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        AVG(CASE WHEN status = 'delivered' AND "actualLeadTimeDays" IS NOT NULL
            THEN "actualLeadTimeDays" END) as avg_actual_lead_time,
        AVG("leadTimeDays") as avg_expected_lead_time,
        AVG(CASE WHEN status = 'delivered' AND "actualLeadTimeDays" IS NOT NULL
            THEN "actualLeadTimeDays" - "leadTimeDays" END) as avg_lead_time_variance,
        COUNT(CASE WHEN status = 'delivered' AND "actualLeadTimeDays" > "leadTimeDays"
            THEN 1 END)::float /
        NULLIF(COUNT(CASE WHEN status = 'delivered' THEN 1 END), 0) * 100 as late_delivery_percentage
      FROM "PurchaseOrders"
      GROUP BY supplier;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop the view
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS supplier_performance;');

    // Remove indexes
    await queryInterface.removeIndex('PurchaseOrders', 'idx_purchase_orders_product_id');
    await queryInterface.removeIndex('PurchaseOrders', 'idx_purchase_orders_supplier');
    await queryInterface.removeIndex('PurchaseOrders', 'idx_purchase_orders_status');
    await queryInterface.removeIndex('PurchaseOrders', 'idx_purchase_orders_order_date');
    await queryInterface.removeIndex('PurchaseOrders', 'idx_purchase_orders_expected_delivery');

    // Drop the table
    await queryInterface.dropTable('PurchaseOrders');

    // Drop the enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PurchaseOrders_status";');
  }
};