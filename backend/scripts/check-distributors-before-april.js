const { Sequelize } = require('sequelize');
require('dotenv').config();

async function checkDistributorsBeforeApril() {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected successfully!\n');

    // Get all unique distributors before April 2025
    const [distributors] = await sequelize.query(`
      SELECT
        distributor_name,
        location,
        state,
        COUNT(*) as order_count,
        SUM(total_pieces) as total_volume,
        MIN(order_date) as first_order,
        MAX(order_date) as last_order
      FROM distributor_orders
      WHERE order_date < '2025-04-01'
      GROUP BY distributor_name, location, state
      ORDER BY distributor_name
    `);

    console.log('Distributors with orders before April 2025:');
    console.log('=' .repeat(80));

    distributors.forEach((dist, index) => {
      console.log(`\n${index + 1}. ${dist.distributor_name}`);
      console.log(`   Location: ${dist.location}, ${dist.state}`);
      console.log(`   Orders: ${dist.order_count}`);
      console.log(`   Total Volume: ${dist.total_volume} pieces`);
      console.log(`   Date Range: ${dist.first_order} to ${dist.last_order}`);
    });

    console.log('\n' + '=' .repeat(80));

    // Show detailed breakdown for each distributor
    console.log('\nDetailed breakdown by distributor:');

    for (const dist of distributors) {
      console.log(`\n${dist.distributor_name} (${dist.location}, ${dist.state}):`);

      const [orders] = await sequelize.query(`
        SELECT
          order_date,
          thickness_72_92,
          thickness_08,
          thickness_1mm,
          total_pieces
        FROM distributor_orders
        WHERE order_date < '2025-04-01'
          AND distributor_name = :name
        ORDER BY order_date
      `, {
        replacements: { name: dist.distributor_name }
      });

      orders.forEach(order => {
        const thicknesses = [];
        if (order.thickness_72_92 > 0) thicknesses.push(`.72/.92: ${order.thickness_72_92}`);
        if (order.thickness_08 > 0) thicknesses.push(`0.8mm: ${order.thickness_08}`);
        if (order.thickness_1mm > 0) thicknesses.push(`1mm: ${order.thickness_1mm}`);

        console.log(`  ${order.order_date}: ${order.total_pieces} pieces (${thicknesses.join(', ') || 'No thickness data'})`);
      });
    }

    console.log('\n' + '=' .repeat(80));
    console.log('SUMMARY:');
    console.log(`Total unique distributors with data before April 2025: ${distributors.length}`);
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkDistributorsBeforeApril();