const { Sequelize } = require('sequelize');
require('dotenv').config();

async function deleteOldOrders() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully!\n');

    // First, get a final count before deletion
    const [beforeCount] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM distributor_orders
      WHERE order_date < '2025-04-01'
    `);

    console.log(`Orders to be deleted: ${beforeCount[0].count}`);

    // Get the distributors that will be affected
    const [affectedDistributors] = await sequelize.query(`
      SELECT
        distributor_name,
        location,
        state,
        COUNT(*) as order_count,
        SUM(total_pieces) as total_volume
      FROM distributor_orders
      WHERE order_date < '2025-04-01'
      GROUP BY distributor_name, location, state
    `);

    console.log('\nDistributors affected:');
    affectedDistributors.forEach(dist => {
      console.log(`  - ${dist.distributor_name} (${dist.location}, ${dist.state}): ${dist.order_count} orders, ${dist.total_volume} pieces`);
    });

    // Perform the deletion
    console.log('\n' + '='.repeat(80));
    console.log('DELETING ORDERS...');
    console.log('='.repeat(80));

    const [result] = await sequelize.query(`
      DELETE FROM distributor_orders
      WHERE order_date < '2025-04-01'
      RETURNING id, distributor_name, order_date, total_pieces
    `);

    console.log(`\nSuccessfully deleted ${result.length} orders`);

    // Verify deletion
    const [afterCount] = await sequelize.query(`
      SELECT COUNT(*) as total_count
      FROM distributor_orders
    `);

    const [newDateRange] = await sequelize.query(`
      SELECT
        MIN(order_date) as earliest_date,
        MAX(order_date) as latest_date
      FROM distributor_orders
    `);

    console.log('\n' + '='.repeat(80));
    console.log('DELETION COMPLETE!');
    console.log('='.repeat(80));
    console.log(`Remaining orders in database: ${afterCount[0].total_count}`);
    console.log(`New date range: ${newDateRange[0].earliest_date} to ${newDateRange[0].latest_date}`);
    console.log('='.repeat(80));

    // Show a few deleted entries for confirmation
    if (result.length > 0) {
      console.log('\nDeleted orders (first 5):');
      result.slice(0, 5).forEach(order => {
        console.log(`  ID ${order.id}: ${order.distributor_name} - ${order.order_date} - ${order.total_pieces} pieces`);
      });
    }

  } catch (error) {
    console.error('Error during deletion:', error);
    console.error('No data was deleted due to the error.');
  } finally {
    await sequelize.close();
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will permanently delete all distributor orders before April 2025');
console.log('This action cannot be undone!\n');

rl.question('Type "DELETE" to confirm deletion: ', (answer) => {
  if (answer === 'DELETE') {
    deleteOldOrders().then(() => {
      rl.close();
    });
  } else {
    console.log('Deletion cancelled.');
    rl.close();
  }
});