'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const newPassword = 'artisuser123'; // or whatever new password you want
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET password = '${hashedPassword}'
      WHERE email = 'admin@artis.com'
    `);
  },

  async down(queryInterface) {
    // Can't restore old password as it was hashed
  }
}; 