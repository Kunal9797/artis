import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function fixPassword() {
  const email = process.argv[2] || 'Kunal@artis.com';
  const newPassword = process.argv[3] || 'kunal123';

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update directly via SQL to bypass the beforeUpdate hook
    console.log(`Setting password for ${email}...`);
    
    await sequelize.query(
      `UPDATE "Users" SET password = :password WHERE email = :email`,
      { 
        replacements: { password: hashedPassword, email },
        type: QueryTypes.UPDATE
      }
    );
    
    console.log('✅ Password updated successfully!\n');
    
    // Verify it worked
    const [users] = await sequelize.query(
      `SELECT password FROM "Users" WHERE email = :email`,
      { 
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );
    
    if (users && (users as any[]).length > 0) {
      const storedHash = ((users as any[])[0] as any).password;
      const match = await bcrypt.compare(newPassword, storedHash);
      
      console.log(`Testing login credentials:`);
      console.log(`- Email: ${email}`);
      console.log(`- Password: ${newPassword}`);
      console.log(`- Result: ${match ? '✅ WORKING!' : '❌ Failed'}`);
      
      if (!match) {
        console.log('\nDebug: Hash comparison');
        console.log('Expected pattern: $2b$10$...');
        console.log('Actual pattern:', storedHash.substring(0, 7));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

fixPassword();