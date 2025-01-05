const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    // 1. Add artisCodes array column
    await queryInterface.addColumn('Products', 'artisCodes', {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true // temporarily allow null
    });

    // 2. Migrate existing artisCode to artisCodes array
    await queryInterface.sequelize.query(`
      UPDATE "Products"
      SET "artisCodes" = ARRAY["artisCode"]
      WHERE "artisCodes" IS NULL
    `);

    // 3. Make artisCodes non-nullable
    await queryInterface.changeColumn('Products', 'artisCodes', {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: []
    });

    // 4. Make supplierCode and supplier required
    await queryInterface.changeColumn('Products', 'supplierCode', {
      type: DataTypes.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('Products', 'supplier', {
      type: DataTypes.STRING,
      allowNull: false
    });

    // 5. Add unique constraint on supplierCode + supplier
    await queryInterface.addConstraint('Products', {
      fields: ['supplierCode', 'supplier'],
      type: 'unique',
      name: 'unique_supplier_code_constraint'
    });

    // 6. Remove old artisCode column
    await queryInterface.removeColumn('Products', 'artisCode');
  },

  async down(queryInterface) {
    // 1. Add back artisCode column
    await queryInterface.addColumn('Products', 'artisCode', {
      type: DataTypes.STRING,
      allowNull: true
    });

    // 2. Migrate first artisCode from array back to single column
    await queryInterface.sequelize.query(`
      UPDATE "Products"
      SET "artisCode" = "artisCodes"[1]
      WHERE array_length("artisCodes", 1) > 0
    `);

    // 3. Remove unique constraint
    await queryInterface.removeConstraint('Products', 'unique_supplier_code_constraint');

    // 4. Make supplierCode and supplier nullable again
    await queryInterface.changeColumn('Products', 'supplierCode', {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('Products', 'supplier', {
      type: DataTypes.STRING,
      allowNull: true
    });

    // 5. Remove artisCodes column
    await queryInterface.removeColumn('Products', 'artisCodes');
  }
}; 