const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Create database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Input file
const INPUT_FILE = path.join(__dirname, '../output/distributor_orders_cleaned.xlsx');

async function importDistributorOrders() {
  try {
    console.log('📚 Reading cleaned Excel file...');

    // Check if file exists
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`File not found: ${INPUT_FILE}`);
    }

    // Read the Excel file
    const workbook = XLSX.readFile(INPUT_FILE);
    const worksheet = workbook.Sheets['Cleaned Orders'];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${data.length} orders to import`);

    // Test database connection
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Clear existing orders if any (optional - comment out if you want to append)
    console.log('🧹 Clearing existing orders...');
    await sequelize.query('DELETE FROM distributor_orders');

    // Prepare data for import
    const ordersToImport = [];
    let skippedCount = 0;

    for (const row of data) {
      // Skip rows with validation errors
      if (row['Validation Status'] === 'ERROR') {
        skippedCount++;
        console.log(`⚠️  Skipping row with error: ${row['Distributor Name']} - ${row['Notes']}`);
        continue;
      }

      // Parse the order date
      const orderDate = new Date(row['Order Date']);
      if (isNaN(orderDate.getTime())) {
        skippedCount++;
        console.log(`⚠️  Skipping row with invalid date: ${row['Order Date']}`);
        continue;
      }

      // Prepare order object
      const order = {
        distributor_name: row['Distributor Name'],
        location: row['Location'],
        state: row['State'] === 'Unknown' ? null : row['State'],
        order_date: orderDate,
        thickness_72_92: parseInt(row['Thickness .72/.82/.92']) || 0,
        thickness_08: parseInt(row['Thickness 0.8mm']) || 0,
        thickness_1mm: parseInt(row['Thickness 1mm']) || 0,
        total_pieces: parseInt(row['Total Pieces']) || 0,
        month_year: row['Month/Year'],
        quarter: row['Quarter'],
        notes: row['Notes'] || null
      };

      ordersToImport.push(order);
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   Total rows in file: ${data.length}`);
    console.log(`   Orders to import: ${ordersToImport.length}`);
    console.log(`   Skipped rows: ${skippedCount}`);

    // Import in batches
    const BATCH_SIZE = 50;
    let imported = 0;

    console.log(`\n📥 Importing orders in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < ordersToImport.length; i += BATCH_SIZE) {
      const batch = ordersToImport.slice(i, i + BATCH_SIZE);

      try {
        // Build insert query for batch
        for (const order of batch) {
          await sequelize.query(
            `INSERT INTO distributor_orders
             (distributor_name, location, state, order_date, thickness_72_92, thickness_08, thickness_1mm, total_pieces, month_year, quarter, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            {
              bind: [
                order.distributor_name,
                order.location,
                order.state,
                order.order_date,
                order.thickness_72_92,
                order.thickness_08,
                order.thickness_1mm,
                order.total_pieces,
                order.month_year,
                order.quarter,
                order.notes,
                new Date(),
                new Date()
              ],
              type: sequelize.QueryTypes.INSERT
            }
          );
        }

        imported += batch.length;
        const progress = Math.round((imported / ordersToImport.length) * 100);
        process.stdout.write(`\r   Progress: ${progress}% (${imported}/${ordersToImport.length})`);
      } catch (error) {
        console.error(`\n❌ Error importing batch starting at index ${i}:`, error.message);
        throw error;
      }
    }

    console.log('\n');

    // Verify import
    const countResult = await sequelize.query(
      'SELECT COUNT(*) as count FROM distributor_orders',
      { type: sequelize.QueryTypes.SELECT }
    );
    const totalInDb = parseInt(countResult[0].count);

    const sampleOrders = await sequelize.query(
      'SELECT * FROM distributor_orders ORDER BY order_date DESC LIMIT 5',
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('✅ Import completed successfully!');
    console.log(`\n📈 Database Statistics:`);
    console.log(`   Total orders in database: ${totalInDb}`);

    // Calculate some quick stats
    const stats = await sequelize.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(total_pieces) as total_pieces,
        COUNT(DISTINCT distributor_name) as unique_distributors,
        COUNT(DISTINCT location) as unique_locations,
        MIN(order_date) as first_order,
        MAX(order_date) as last_order
      FROM distributor_orders
    `, { type: sequelize.QueryTypes.SELECT });

    const stat = stats[0];
    console.log(`   Total pieces: ${parseInt(stat.total_pieces).toLocaleString()}`);
    console.log(`   Unique distributors: ${stat.unique_distributors}`);
    console.log(`   Unique locations: ${stat.unique_locations}`);
    console.log(`   Date range: ${new Date(stat.first_order).toLocaleDateString()} to ${new Date(stat.last_order).toLocaleDateString()}`);

    console.log(`\n📋 Sample imported orders:`);
    sampleOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.distributor_name} - ${order.location} - ${order.total_pieces} pcs (${new Date(order.order_date).toLocaleDateString()})`);
    });

    console.log('\n🎉 Import complete! You can now view the orders in the web application.');
    console.log('   Navigate to: Distributor Orders page in the dashboard');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the import
console.log('='.repeat(60));
console.log('DISTRIBUTOR ORDERS IMPORT');
console.log('='.repeat(60));
importDistributorOrders();