const { Sequelize } = require('sequelize');
const dayjs = require('dayjs');
require('dotenv').config();

async function checkOldOrders() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully!\n');

    // Get total count
    const [totalResult] = await sequelize.query(`
      SELECT COUNT(*) as total_orders
      FROM distributor_orders
    `);
    console.log(`Total distributor orders in database: ${totalResult[0].total_orders}`);

    // Get date range
    const [dateRange] = await sequelize.query(`
      SELECT
        MIN(order_date) as earliest_date,
        MAX(order_date) as latest_date
      FROM distributor_orders
    `);
    console.log(`Date range: ${dateRange[0].earliest_date} to ${dateRange[0].latest_date}\n`);

    // Count orders before April 2025
    const [beforeApril] = await sequelize.query(`
      SELECT
        COUNT(*) as count,
        MIN(order_date) as earliest_date,
        MAX(order_date) as latest_date
      FROM distributor_orders
      WHERE order_date < '2025-04-01'
    `);
    console.log(`Orders BEFORE April 2025: ${beforeApril[0].count}`);
    if (beforeApril[0].count > 0) {
      console.log(`  Date range: ${beforeApril[0].earliest_date} to ${beforeApril[0].latest_date}`);
    }

    // Count orders from April 2025 onwards
    const [fromApril] = await sequelize.query(`
      SELECT
        COUNT(*) as count,
        MIN(order_date) as earliest_date,
        MAX(order_date) as latest_date
      FROM distributor_orders
      WHERE order_date >= '2025-04-01'
    `);
    console.log(`Orders FROM April 2025 onwards: ${fromApril[0].count}`);
    if (fromApril[0].count > 0) {
      console.log(`  Date range: ${fromApril[0].earliest_date} to ${fromApril[0].latest_date}`);
    }

    // Show breakdown by month for orders before April 2025
    if (beforeApril[0].count > 0) {
      console.log('\nBreakdown by month (before April 2025):');
      const [monthlyBreakdown] = await sequelize.query(`
        SELECT
          TO_CHAR(order_date, 'YYYY-MM') as month,
          COUNT(*) as order_count,
          SUM(total_pieces) as total_volume
        FROM distributor_orders
        WHERE order_date < '2025-04-01'
        GROUP BY TO_CHAR(order_date, 'YYYY-MM')
        ORDER BY month
      `);

      monthlyBreakdown.forEach(month => {
        console.log(`  ${month.month}: ${month.order_count} orders, ${month.total_volume} pieces`);
      });
    }

    // Show some sample entries before April 2025
    if (beforeApril[0].count > 0) {
      console.log('\nSample entries before April 2025 (first 5):');
      const [sampleEntries] = await sequelize.query(`
        SELECT
          distributor_name,
          location,
          state,
          order_date,
          total_pieces
        FROM distributor_orders
        WHERE order_date < '2025-04-01'
        ORDER BY order_date
        LIMIT 5
      `);

      sampleEntries.forEach(entry => {
        console.log(`  ${entry.order_date}: ${entry.distributor_name} (${entry.location}, ${entry.state}) - ${entry.total_pieces} pieces`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total orders to be deleted (before April 2025): ${beforeApril[0].count}`);
    console.log(`Total orders to be kept (from April 2025): ${fromApril[0].count}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkOldOrders();