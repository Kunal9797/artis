import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import specs from './config/swagger';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';
import distributorRoutes from './routes/distributor.routes';
import salesRoutes from './routes/sales.routes';
import contactsRoutes from './routes/contacts.routes';
import sheetsRoutes from './routes/sheets.routes';
import procurementRoutes from './routes/procurement';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';

const app = express();

// Middleware
app.use(cors({
  origin: ['https://artis-rust.vercel.app', 'https://inventory.artislaminates.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation route (must be before rate limiters)
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(specs));

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/distributors', distributorRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/procurement', procurementRoutes);

export default app; 