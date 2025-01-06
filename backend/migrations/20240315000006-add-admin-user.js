'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash('artisadmin123', 10);
    
    await queryInterface.bulkInsert('Users', [{
      id: '00000000-0000-0000-0000-000000000000',
      username: 'admin',
      email: 'admin@artis.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', {
      email: 'admin@artis.com'
    });
  }
}; 