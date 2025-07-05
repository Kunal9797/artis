import sequelize from '../config/sequelize';
import { User } from '../models';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('Usage: npx ts-node src/scripts/reset-password.ts <email> <newPassword>');
    console.log('Example: npx ts-node src/scripts/reset-password.ts Kunal@artis.com newpassword123');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');
    
    // Find user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }
    
    // Hash the new password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await user.update({ password: hashedPassword });
    
    console.log('✅ Password reset successfully!');
    console.log(`
You can now login with:
- Email: ${email}
- Password: ${newPassword}
`);
    
    // Test the new password immediately
    console.log('Testing new password...');
    const testUser = await User.findOne({ where: { email } });
    const passwordMatch = await bcrypt.compare(newPassword, (testUser as any).password);
    console.log(`Password test: ${passwordMatch ? '✅ WORKING' : '❌ FAILED'}`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await sequelize.close();
  }
}

resetPassword();