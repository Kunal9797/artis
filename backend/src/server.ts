import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/sequelize';
import { User } from './models';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';
import distributorRoutes from './routes/distributor.routes';
import swaggerUi from 'swagger-ui-express';
import specs from './config/swagger';
import { exec } from 'child_process';
import { promisify } from 'util';
import { initializeAssociations } from './models/associations';
import salesRoutes from './routes/sales.routes';
import statsRoutes from './routes/stats.routes';
import sheetsRoutes from './routes/sheets.routes';
import { auth } from './middleware/auth';

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

// Add global auth middleware for /api routes
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login' || req.path === '/auth/register') {
    return next();
  }
  auth(req, res, next);
});

// Swagger documentation route (must be before other routes)
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(specs));

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
app.use('/api/distributors', distributorRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/sheets', sheetsRoutes);

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

// After database connection
initializeAssociations();

const PORT = parseInt(process.env.PORT || '8099', 10);

// Determine database source
const isDatabaseUrlSet = !!process.env.DATABASE_URL;
const isSupabase = process.env.DATABASE_URL?.includes('supabase');
const databaseSource = isDatabaseUrlSet 
  ? (isSupabase ? 'Supabase' : 'Render') 
  : 'Local PostgreSQL';

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`🗄️  Database: ${databaseSource}`);
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');
    
    // Only run migrations in production
    if (process.env.NODE_ENV === 'production') {
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
    }

    // Skip sync for Supabase - schema is already set up
    if (!isSupabase) {
      await sequelize.sync({ alter: true });
      console.log('✓ Models synced successfully');
    } else {
      console.log('✓ Using existing Supabase schema');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
});

export default app;

