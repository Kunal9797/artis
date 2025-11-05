'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check current id type
      const [columns] = await queryInterface.sequelize.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'Leads' 
        AND column_name = 'id'
      `);

      // Only modify if it's an integer
      if (columns.length > 0 && columns[0].data_type === 'integer') {
        // Create temporary column
        await queryInterface.addColumn('Leads', 'uuid_id', {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        });

        // Update the temporary column with UUIDs
        await queryInterface.sequelize.query(`
          UPDATE "Leads" 
          SET uuid_id = gen_random_uuid()
        `);

        // Drop the primary key constraint
        await queryInterface.removeConstraint('Leads', 'Leads_pkey');

        // Drop the old id column
        await queryInterface.removeColumn('Leads', 'id');

        // Rename uuid_id to id
        await queryInterface.renameColumn('Leads', 'uuid_id', 'id');

        // Add primary key constraint
        await queryInterface.addConstraint('Leads', {
          fields: ['id'],
          type: 'primary key',
          name: 'Leads_pkey'
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // No down migration as this is a data preservation change
  }
};