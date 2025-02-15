'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    // First check if admin exists
    const adminExists = await queryInterface.sequelize.query(
      `SELECT * FROM "Users" WHERE username = 'admin'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (adminExists.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await queryInterface.bulkInsert('Users', [{
        id: '00000000-0000-0000-0000-000000000000',
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', { username: 'admin' });
  }
}; 