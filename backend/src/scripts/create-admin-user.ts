import sequelize from '../config/sequelize';
import { User } from '../models';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  const email = process.argv[2];
  const username = process.argv[3];
  const password = process.argv[4];

  if (!email || !username || !password) {
    console.log('Usage: npx ts-node src/scripts/create-admin-user.ts <email> <username> <password>');
    console.log('Example: npx ts-node src/scripts/create-admin-user.ts admin2@artis.com admin2 mypassword123');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.error(`❌ User with email ${email} already exists!`);
      process.exit(1);
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    const newUser = await User.create({
      email,
      username,
      password: hashedPassword,
      role: 'admin',
      firstName: username,  // Using username as firstName
      lastName: 'Admin',    // Default last name
      phoneNumber: '0000000000'  // Default phone number
    } as any);
    
    console.log('✅ Admin user created successfully!');
    console.log(`
Details:
- Email: ${email}
- Username: ${username}
- Role: admin
- ID: ${(newUser as any).id}

You can now login with:
- Email: ${email}
- Password: ${password}
`);
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await sequelize.close();
  }
}

createAdminUser();