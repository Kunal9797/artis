import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Override with current database settings for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/artis_test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: console.error, // Keep error logs for debugging
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};