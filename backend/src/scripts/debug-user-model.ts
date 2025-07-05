import sequelize from '../config/sequelize';
import { User } from '../models';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { QueryTypes } from 'sequelize';

dotenv.config();

async function debugUser() {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');
    
    const email = 'Kunal@artis.com';
    
    // Method 1: Direct SQL query to see raw data
    console.log('1. Checking raw database values:');
    const [rawUsers] = await sequelize.query(
      `SELECT id, email, username, password, role FROM "Users" WHERE email = :email`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );
    
    console.log('Raw user data:', rawUsers);
    
    // Method 2: Update password directly via SQL
    console.log('\n2. Setting password directly via SQL:');
    const testPassword = 'test123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    await sequelize.query(
      `UPDATE "Users" SET password = :password WHERE email = :email`,
      { replacements: { password: hashedPassword, email } }
    );
    
    console.log('Password updated via SQL');
    
    // Method 3: Test the password
    console.log('\n3. Testing password:');
    const [updatedUsers] = await sequelize.query(
      `SELECT password FROM "Users" WHERE email = :email`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );
    
    if (updatedUsers && updatedUsers[0]) {
      const storedHash = (updatedUsers[0] as any).password;
      console.log('Stored hash:', storedHash.substring(0, 20) + '...');
      
      const match = await bcrypt.compare(testPassword, storedHash);
      console.log(`Password "${testPassword}" matches: ${match ? '✅ YES' : '❌ NO'}`);
      
      // Also check if there's a beforeUpdate hook messing with the password
      console.log('\n4. Checking for model hooks...');
      const user = await User.findOne({ where: { email } });
      console.log('User model hooks:', Object.keys((User as any).hooks || {}));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

debugUser();