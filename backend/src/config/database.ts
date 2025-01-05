import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';
import Transaction from '../models/Transaction';

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../../.env') });

let sequelize: Sequelize;

if (process.env.NODE_ENV === 'production') {
  sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'artis_db',
    port: parseInt(process.env.DB_PORT || '5432'),
    logging: false
  });
}

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

// Sync all models
async function syncDatabase() {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully');
  } catch (error) {
    console.error('Error syncing database:', error);
  }
}

syncDatabase();

export default sequelize; 