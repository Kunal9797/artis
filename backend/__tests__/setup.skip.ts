import sequelize from '../src/config/database.test';
import jwt from 'jsonwebtoken';
import { User } from '../src/models';

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  
  // Create test user and token
  const testUser = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin'
  });

  const token = jwt.sign(
    { userId: testUser.id, email: testUser.email },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  global.testToken = token;
});

afterAll(async () => {
  await sequelize.close();
});

// Add a dummy test to satisfy Jest
test('database setup', () => {
  expect(true).toBe(true);
}); 