'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First get information about the enum
      const query = `
        SELECT t.typname, e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'enum_transactions_type'
        ORDER BY e.enumsortorder;
      `;
      
      const result = await queryInterface.sequelize.query(query);
      const existingValues = result[0].map(row => row.enumlabel);
      
      // Check if CORRECTION already exists
      if (!existingValues.includes('CORRECTION')) {
        // Add the new enum value
        await queryInterface.sequelize.query(`
          ALTER TYPE "enum_Transactions_type" ADD VALUE 'CORRECTION';
        `);
        
        console.log('Successfully added CORRECTION to transaction type enum');
      } else {
        console.log('CORRECTION value already exists in enum');
      }
    } catch (error) {
      console.error('Migration error:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL does not support removing enum values directly
    console.log('Cannot remove enum value in down migration');
  }
}; 