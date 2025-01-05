const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      const query = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND column_name = '${columnName}'`;
      const [results] = await queryInterface.sequelize.query(query);
      return results.length > 0;
    };

    // 1. Add new columns to Products table if they don't exist
    const columnsToAdd = {
      currentStock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      avgConsumption: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: true
      },
      minStockLevel: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      }
    };

    for (const [columnName, columnDef] of Object.entries(columnsToAdd)) {
      if (!(await columnExists('Products', columnName))) {
        await queryInterface.addColumn('Products', columnName, columnDef);
      }
    }

    // 2. Set default values for existing records
    await queryInterface.sequelize.query(`
      UPDATE "Products"
      SET 
        "currentStock" = COALESCE("currentStock", 0),
        "avgConsumption" = COALESCE("avgConsumption", 0),
        "lastUpdated" = COALESCE("lastUpdated", CURRENT_TIMESTAMP)
    `);

    // 3. Migrate data from Inventories if the table exists
    const inventoryTableExists = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'Inventories'
      );
    `);

    if (inventoryTableExists[0][0].exists) {
      await queryInterface.sequelize.query(`
        UPDATE "Products" p
        SET 
          "currentStock" = i."currentStock",
          "lastUpdated" = i."lastUpdated",
          "minStockLevel" = i."minStockLevel"
        FROM "Inventories" i
        WHERE p.id = i."productId"
      `);

      // Drop Inventories table
      await queryInterface.dropTable('Inventories');
    }

    // 4. Make columns non-nullable
    const columnsToModify = {
      currentStock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      avgConsumption: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    };

    for (const [columnName, columnDef] of Object.entries(columnsToModify)) {
      await queryInterface.changeColumn('Products', columnName, columnDef);
    }
  },

  async down(queryInterface) {
    // Recreate Inventories table
    await queryInterface.createTable('Inventories', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Products',
          key: 'id'
        }
      },
      currentStock: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      minStockLevel: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Remove columns from Products
    await queryInterface.removeColumn('Products', 'currentStock');
    await queryInterface.removeColumn('Products', 'avgConsumption');
    await queryInterface.removeColumn('Products', 'lastUpdated');
    await queryInterface.removeColumn('Products', 'minStockLevel');
  }
}; 