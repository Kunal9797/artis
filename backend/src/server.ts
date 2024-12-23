import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';
import { User } from './models';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';

// Load environment variables
dotenv.config();

// Initialize express app
export const app = express();

// Middleware
app.use(cors({
  origin: ['https://artis-rust.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);

// Test route
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ message: 'Backend is working!' });
});

// Add this after your routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('Database models synchronized.');

    const createInitialUser = async () => {
      const userCount = await User.count();
      if (userCount === 0) {
        await User.create({
          username: 'admin',
          email: 'admin@artis.com',
          password: 'admin123',
          role: 'admin'
        });
        console.log('Initial admin user created');
      }
    };

    await createInitialUser();

  } catch (error) {
    console.error('Unable to initialize database:', error);
    process.exit(1);
  }
};

// Add after initializeDatabase() but before export default app
const PORT = process.env.PORT || 8099;

if (process.env.NODE_ENV !== 'test') {
  initializeDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;
