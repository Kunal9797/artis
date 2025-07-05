import sequelize from '../config/sequelize';
import { User } from '../models';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function testLogin() {
  const email = process.argv[2] || 'Kunal@artis.com';
  const password = process.argv[3] || 'kunal';

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');
    
    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      
      // Show all users
      const allUsers = await User.findAll({ 
        attributes: ['email', 'username', 'role'] 
      });
      console.log('\nAvailable users:');
      allUsers.forEach((u: any) => {
        console.log(`- ${u.email} (${u.username})`);
      });
      return;
    }
    
    console.log(`✅ User found: ${(user as any).email}`);
    console.log(`   Username: ${(user as any).username}`);
    console.log(`   Role: ${(user as any).role}`);
    
    // Test password
    const passwordMatch = await bcrypt.compare(password, (user as any).password);
    console.log(`\n🔐 Password test: ${passwordMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    if (!passwordMatch) {
      // Try some common issues
      console.log('\nDebug info:');
      console.log(`- Password provided: "${password}"`);
      console.log(`- Password length: ${password.length}`);
      console.log(`- Stored hash starts with: ${(user as any).password.substring(0, 20)}...`);
      
      // Test if it's a case sensitivity issue
      const lowerMatch = await bcrypt.compare(password.toLowerCase(), (user as any).password);
      const upperMatch = await bcrypt.compare(password.toUpperCase(), (user as any).password);
      
      if (lowerMatch) console.log('⚠️  Password works in lowercase!');
      if (upperMatch) console.log('⚠️  Password works in uppercase!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

testLogin();