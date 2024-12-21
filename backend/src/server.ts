import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';
import { User } from './models';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';

// Load environment variables
dotenv.config();

// Initialize express app
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Test route
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ message: 'Backend is working!' });
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

// Call initializeDatabase before starting the server
initializeDatabase().then(() => {
  const PORT = process.env.PORT || 8099;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

export default app;
