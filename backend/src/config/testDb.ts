import sequelize from './database';
import { User } from '../models';

const testDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection successful');

    await sequelize.sync({ force: false });
    console.log('✓ Models synchronized');

    const tables = await sequelize.showAllSchemas({ logging: console.log });
    console.log('\nDatabase tables:');
    console.log(tables);

    const userCount = await User.count();
    console.log(`\nUsers in database: ${userCount}`);

  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await sequelize.close();
  }
};

testDatabase(); 