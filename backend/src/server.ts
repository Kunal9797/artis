import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';
import { User, SKU } from './models';
import { InventoryType, MeasurementUnit } from './models/SKU';
import authRoutes from './routes/auth.routes';
import skuRoutes from './routes/sku.routes';
import inventoryMovementRoutes from './routes/inventoryMovement.routes';

// Load environment variables
dotenv.config();

// Initialize express app
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/inventory-movements', inventoryMovementRoutes);

// Initialize database with proper migrations
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Drop the existing SKUs table and recreate it
    await sequelize.query('DROP TABLE IF EXISTS "SKUs" CASCADE');
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('Database models synchronized.');

    // Create some initial SKUs if none exist
    const skuCount = await SKU.count();
    if (skuCount === 0) {
      await SKU.bulkCreate([
        {
          code: 'DPR001',
          name: 'Design Paper Roll 1',
          description: 'Standard design paper roll',
          category: 'Standard',
          inventoryType: InventoryType.DESIGN_PAPER_ROLL,
          measurementUnit: MeasurementUnit.WEIGHT,
          quantity: 100,
          minimumStock: 20,
          reorderPoint: 30
        },
        {
          code: 'DPS001',
          name: 'Design Paper Sheet 1',
          description: 'Processed design paper sheet',
          category: 'Standard',
          inventoryType: InventoryType.DESIGN_PAPER_SHEET,
          measurementUnit: MeasurementUnit.UNITS,
          quantity: 1000,
          minimumStock: 200,
          reorderPoint: 300
        }
      ]);
      console.log('Initial SKUs created.');
    }
  } catch (error) {
    console.error('Unable to initialize database:', error);
    process.exit(1);
  }
};

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Artis API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/inventory-movements', inventoryMovementRoutes);

// Start server
const PORT = process.env.PORT || 8099;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initializeDatabase();
});
