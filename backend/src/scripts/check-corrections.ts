import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false
});

async function checkCorrections() {
  try {
    // First check what tables exist
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Available tables:');
    tables.forEach((t: any) => console.log(`- ${t.table_name}`));
    
    // Check if corrections table exists
    const hasCorrections = tables.some((t: any) => t.table_name === 'corrections');
    
    if (!hasCorrections) {
      console.log('\n❌ Corrections table does not exist in the database!');
      console.log('This explains why the corrections sheet is empty.');
      console.log('\nThe corrections feature may not be implemented yet in the database.');
    } else {
      // Query corrections
      const [results] = await sequelize.query(`
        SELECT c.*, d.name as design_name, d.design_code
        FROM corrections c
        JOIN designs d ON c.design_id = d.id
        ORDER BY c.created_at DESC
      `);
      
      console.log('\nTotal corrections in database:', results.length);
      
      if (results.length > 0) {
        console.log('\nCorrections found:');
        results.forEach((c: any, index: number) => {
          console.log(`${index + 1}. Design ${c.design_code} (${c.design_name}): ${c.amount}kg - ${c.type}`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking corrections:', error);
    process.exit(1);
  }
}

checkCorrections();