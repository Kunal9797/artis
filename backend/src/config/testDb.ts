import sequelize from './database';
import { User, SKU } from '../models';

const testDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✓ Database connection successful');

    // Sync models
    await sequelize.sync({ force: false });
    console.log('✓ Models synchronized');

    // List all tables
    const tables = await sequelize.showAllSchemas({ logging: console.log });
    console.log('\nDatabase tables:');
    console.log(tables);

    // Test User model
    const userCount = await User.count();
    console.log(`\nUsers in database: ${userCount}`);

    // Test SKU model
    const skuCount = await SKU.count();
    console.log(`SKUs in database: ${skuCount}`);

  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await sequelize.close();
  }
};

testDatabase(); 