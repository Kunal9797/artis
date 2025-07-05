#!/usr/bin/env node

/**
 * Direct Monthly Upload Script for Artis Laminates
 * 
 * Usage: node monthly_upload_direct.js <excel-file-path>
 * Example: node monthly_upload_direct.js ~/Downloads/consumption_jan2025.xlsx
 */

const XLSX = require('xlsx');
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment
dotenv.config({ path: path.join(__dirname, 'backend/.env.supabase') });

async function uploadMonthlyData(filePath) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase');

    // Read Excel file
    console.log('📖 Reading Excel file:', filePath);
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

    console.log(`Found ${rawData.length} rows`);

    const [headerRow, dateRow] = rawData;
    const dataRows = rawData.slice(2);

    // Find date columns
    const dateColumns = [];
    headerRow.forEach((header, index) => {
      const dateStr = dateRow[index];
      if (dateStr && typeof dateStr === 'string' && dateStr.includes('/')) {
        dateColumns.push({
          index,
          dateStr,
          header: header
        });
      }
    });

    console.log(`Found ${dateColumns.length} date columns:`, dateColumns.map(d => d.dateStr));

    // Get all products for lookup
    console.log('🔍 Loading products...');
    const productResult = await client.query(`
      SELECT id, "artisCodes" FROM "Products"
    `);
    
    // Create product lookup map
    const productMap = new Map();
    productResult.rows.forEach(product => {
      product.artisCodes.forEach(code => {
        productMap.set(code.toString(), product.id);
      });
    });

    console.log(`Loaded ${productResult.rows.length} products`);

    // Process data
    let transactionCount = 0;
    let skippedCount = 0;
    const transactions = [];

    console.log('🔄 Processing data...');
    
    for (const row of dataRows) {
      const artisCode = row[1]?.toString(); // DESIGN CODE column
      
      if (!artisCode) {
        skippedCount++;
        continue;
      }

      const productId = productMap.get(artisCode);
      if (!productId) {
        console.log(`⚠️  Product not found: ${artisCode}`);
        skippedCount++;
        continue;
      }

      // Process each date column
      for (const dateCol of dateColumns) {
        const quantity = parseFloat(row[dateCol.index]) || 0;
        
        if (quantity > 0) {
          // Parse date DD/MM/YY
          const [day, month, year] = dateCol.dateStr.split('/');
          const date = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
          
          transactions.push({
            productId,
            type: dateCol.header === 'OPEN' || dateCol.header === 'IN' ? 'IN' : 'OUT',
            quantity,
            date: date.toISOString(),
            notes: `Monthly upload - ${date.toLocaleDateString()}`
          });
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- Products processed: ${dataRows.length - skippedCount}`);
    console.log(`- Products skipped: ${skippedCount}`);
    console.log(`- Transactions to create: ${transactions.length}`);

    // Insert transactions in batches
    if (transactions.length > 0) {
      console.log('\n💾 Inserting transactions...');
      
      const batchSize = 100;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        const values = batch.map((t, idx) => 
          `($${idx * 5 + 1}::uuid, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5})`
        ).join(',');
        
        const params = batch.flatMap(t => [
          t.productId,
          t.type,
          t.quantity,
          t.date,
          t.notes
        ]);
        
        await client.query(`
          INSERT INTO "Transactions" ("productId", type, quantity, date, notes, "includeInAvg")
          VALUES ${values.replace(/\$(\d+)/g, (match, num) => {
            const idx = Math.floor((parseInt(num) - 1) / 5);
            const field = (parseInt(num) - 1) % 5;
            if (field === 0) return `$${parseInt(num)}`;
            if (field === 1) return `$${parseInt(num)}::"enum_Transactions_type"`;
            return `$${parseInt(num)}`;
          })}
          ${batch.map((_, idx) => `, true`).join('')}
        `.replace(/, true/g, '').replace('VALUES', 'VALUES' + batch.map(() => ', true').join('').substring(1).replace(/true/g, '')), 
          params
        );
        
        // Simpler approach - insert one by one (slower but works)
        for (const t of batch) {
          await client.query(`
            INSERT INTO "Transactions" ("productId", type, quantity, date, notes, "includeInAvg")
            VALUES ($1::uuid, $2::"enum_Transactions_type", $3, $4, $5, true)
          `, [t.productId, t.type, t.quantity, t.date, t.notes]);
          transactionCount++;
        }
        
        console.log(`Inserted ${Math.min(i + batchSize, transactions.length)}/${transactions.length} transactions`);
      }
    }

    console.log('\n✅ Upload completed successfully!');
    
    // Show sample of current stock
    console.log('\n📈 Sample stock levels:');
    const sampleStock = await client.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        p.supplier,
        COALESCE(SUM(
          CASE 
            WHEN t.type = 'IN' THEN t.quantity
            WHEN t.type = 'OUT' THEN -t.quantity
          END
        ), 0) as current_stock
      FROM "Products" p
      LEFT JOIN "Transactions" t ON p.id = t."productId"
      GROUP BY p.id, p."artisCodes", p.supplier
      HAVING COUNT(t.id) > 0
      ORDER BY current_stock DESC
      LIMIT 10
    `);
    
    console.table(sampleStock.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

// Main execution
const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node monthly_upload_direct.js <excel-file-path>');
  console.log('Example: node monthly_upload_direct.js ~/Downloads/consumption_jan2025.xlsx');
  process.exit(1);
}

console.log('🚀 Artis Monthly Upload Script');
console.log('==============================\n');

uploadMonthlyData(filePath);