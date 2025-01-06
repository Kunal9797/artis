import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/sequelize';
import { User } from './models';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Initialize express app
export const app = express();

// Middleware
app.use(cors({
  origin: [
    'https://artis-rust.vercel.app',
    'https://artis-backend.onrender.com',
    'http://localhost:3000',
    'http://localhost:8099'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database connection for each request
app.use(async (req, res, next) => {
  try {
    await sequelize.authenticate();
    next();
  } catch (error) {
    console.error('Unable to connect to database:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);

// Test route
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ message: 'Backend is working!' });
});

// Add this after your routes
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

const PORT = parseInt(process.env.PORT || '8099', 10);
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log('Database initialization starting...');
  
  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Run migrations
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

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('✓ Models synced successfully');
    
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
});

export default app;

