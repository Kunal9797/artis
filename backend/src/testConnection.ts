import { Sequelize } from 'sequelize';

const testConnection = async () => {
  const sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: true // Enable logging to see the actual connection attempt
  });

  try {
    await sequelize.authenticate();
    console.log('✓ Connection successful!');
    console.log('Database URL:', process.env.DATABASE_URL);
  } catch (error) {
    console.error('✕ Connection failed:', error);
  } finally {
    await sequelize.close();
  }
};

testConnection(); 