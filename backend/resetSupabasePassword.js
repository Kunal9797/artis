const bcrypt = require('bcrypt');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load Supabase environment
dotenv.config({ path: '.env.supabase' });

async function resetPassword(email, newPassword) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase');

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    const query = `
      UPDATE "Users" 
      SET password = $1, "updatedAt" = NOW(), version = version + 1
      WHERE email = $2
      RETURNING id, username, email
    `;
    
    const result = await client.query(query, [hashedPassword, email]);
    
    if (result.rows.length > 0) {
      console.log('✅ Password reset successfully for:', result.rows[0]);
    } else {
      console.log('❌ User not found with email:', email);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

// Usage: node resetSupabasePassword.js <email> <newPassword>
const email = process.argv[2] || 'admin@artis.com';
const newPassword = process.argv[3] || 'admin123';

console.log(`Resetting password for ${email}...`);
resetPassword(email, newPassword);