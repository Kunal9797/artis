const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load Supabase environment
dotenv.config({ path: '.env.supabase' });

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  
  try {
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });

    await sequelize.authenticate();
    console.log('✅ Connected to Supabase successfully!');
    
    // Test query
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM "Products"');
    console.log('✅ Products count:', results[0].count);
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();