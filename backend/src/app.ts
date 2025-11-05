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

// CORS configuration with explicit origin function
const allowedOrigins = [
  'https://artis-rust.vercel.app',
  'https://inventory.artislaminates.com',
  'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
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