const { Client } = require('pg');
require('dotenv').config();
const bcrypt = require('bcrypt');

// Database connection parameters from .env
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'artis_db'
};

async function debugAndFixPassword() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connected to database successfully');
    
    // 1. Get current admin user
    const adminQuery = await client.query('SELECT * FROM "Users" WHERE username = $1', ['admin']);
    
    if (adminQuery.rows.length === 0) {
      console.log('Admin user not found in database');
      return;
    }
    
    const admin = adminQuery.rows[0];
    console.log('Found admin user:', admin.username);
    console.log('Current password hash:', admin.password);
    
    // 2. Create a new simple plain password and hash it
    const newPlainPassword = 'admin123';
    const newHashedPassword = await bcrypt.hash(newPlainPassword, 10);
    console.log('New plain password:', newPlainPassword);
    console.log('New password hash:', newHashedPassword);
    
    // 3. Update the admin password
    const updateResult = await client.query(
      'UPDATE "Users" SET password = $1, version = version + 1, "updatedAt" = NOW() WHERE username = $2 RETURNING *',
      [newHashedPassword, 'admin']
    );
    
    if (updateResult.rows.length === 0) {
      console.log('Failed to update password');
      return;
    }
    
    console.log('Password updated successfully');
    console.log('New admin version:', updateResult.rows[0].version);
    
    // 4. Verify the new password works with bcrypt compare
    const verifyResult = await bcrypt.compare(newPlainPassword, updateResult.rows[0].password);
    console.log('Password verification with bcrypt.compare:', verifyResult ? 'SUCCESS' : 'FAILED');
    
    console.log('\n=== LOGIN INSTRUCTIONS ===');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Please try these credentials to log in');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

debugAndFixPassword(); 