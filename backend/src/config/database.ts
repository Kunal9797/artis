import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import sequelize from './sequelize';

const execAsync = promisify(exec);
dotenv.config();

const syncDatabase = async () => {
  try {
    console.log('Starting database sync and migrations...');
    
    await sequelize.authenticate();
    console.log('✓ Database connected');

    console.log('Running migrations...');
    try {
      const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate');
      console.log('Migration output:', stdout);
      if (stderr) console.error('Migration stderr:', stderr);
      console.log('✓ Migrations completed');
    } catch (migrationError) {
      console.error('Migration error:', migrationError);
      throw migrationError;
    }

    await sequelize.sync({ alter: true });
    console.log('✓ Models synced successfully');
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

if (require.main === module) {
  syncDatabase().catch(error => {
    console.error('Failed to sync database:', error);
    process.exit(1);
  });
}

export default syncDatabase; 