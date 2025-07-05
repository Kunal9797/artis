import sequelize from '../config/sequelize';
import User from '../models/User';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkUsers() {
  try {
    console.log('Connecting to Supabase database...');
    console.log(`Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}`);
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully!\n');

    // Get all users
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'firstName', 'lastName', 'phoneNumber', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${users.length} users in the database:\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in the database!');
      console.log('This might be why login is not working.\n');
      console.log('To create a test admin user, you can run:');
      console.log('node dist/scripts/create-admin-user.js\n');
    } else {
      // Display users in a table format
      console.log('ID | Username | Email | Role | Name | Phone | Created');
      console.log('---|----------|-------|------|------|-------|--------');
      
      users.forEach(user => {
        const userData = user.get({ plain: true });
        console.log(
          `${userData.id.substring(0, 8)}... | ` +
          `${userData.username.padEnd(10)} | ` +
          `${userData.email.padEnd(30)} | ` +
          `${userData.role.padEnd(15)} | ` +
          `${(userData.firstName + ' ' + userData.lastName).padEnd(20)} | ` +
          `${userData.phoneNumber.padEnd(15)} | ` +
          `${new Date(userData.createdAt).toLocaleDateString()}`
        );
      });
      
      console.log('\n📊 User Role Summary:');
      const roleCounts = users.reduce((acc, user) => {
        const role = user.get('role') as string;
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`  - ${role}: ${count} user(s)`);
      });
    }

    // Check if admin user exists
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) {
      console.log('\n⚠️  WARNING: No admin user found!');
      console.log('An admin user is required for initial system setup.');
    }

    // Test a specific user login (if email provided as argument)
    const testEmail = process.argv[2];
    if (testEmail) {
      console.log(`\n🔍 Testing login for email: ${testEmail}`);
      const user = await User.findOne({ where: { email: testEmail } });
      
      if (!user) {
        console.log('❌ User not found with this email!');
      } else {
        console.log('✅ User found:');
        console.log(`  - Username: ${user.get('username')}`);
        console.log(`  - Role: ${user.get('role')}`);
        console.log(`  - Name: ${user.get('firstName')} ${user.get('lastName')}`);
        console.log(`  - Password hash exists: ${!!user.get('password')}`);
        console.log('\nNote: Password validation requires the actual password.');
      }
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  } finally {
    await sequelize.close();
  }
}

// Run the script
checkUsers();