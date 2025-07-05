import sequelize from '../config/sequelize';
import { User } from '../models';
import * as dotenv from 'dotenv';

dotenv.config();

async function listUsers() {
  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database\n');
    
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`Found ${users.length} users:\n`);
    console.log('ID | Email | Username | Role | Created');
    console.log('---|-------|----------|------|--------');
    
    users.forEach((user: any) => {
      console.log(
        `${user.id} | ${user.email} | ${user.username || 'N/A'} | ${user.role} | ${user.createdAt.toLocaleDateString()}`
      );
    });
    
    // Also show a simple list for easy copy-paste
    console.log('\n\nQuick reference:');
    users.forEach((user: any) => {
      console.log(`Email: ${user.email}, Role: ${user.role}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

listUsers();