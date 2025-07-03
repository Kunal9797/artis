const { Client } = require('pg');
const dotenv = require('dotenv');

// Load Supabase environment
dotenv.config({ path: '.env.supabase' });

async function clearTransactions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase');

    // Delete all transactions
    const result = await client.query('DELETE FROM "Transactions"');
    console.log(`✅ Deleted ${result.rowCount} transactions`);

    // Check current state
    const countResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Products") as product_count,
        (SELECT COUNT(*) FROM "Transactions") as transaction_count,
        (SELECT COUNT(*) FROM "BulkOperations") as bulk_operation_count
    `);
    
    console.log('\nCurrent state:');
    console.table(countResult.rows[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

console.log('🧹 Clearing all transactions...\n');
clearTransactions();