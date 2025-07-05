import sequelize from '../config/sequelize';
import { QueryTypes } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();

interface VerificationResult {
  category: string;
  expected: any;
  actual: any;
  status: '✅' | '❌' | '⚠️';
  message?: string;
}

async function verifySync() {
  console.log('🔍 Verifying Synced Data...\n');
  
  const results: VerificationResult[] = [];
  
  try {
    await sequelize.authenticate();
    
    // 1. Verify Total Counts
    console.log('📊 Checking transaction counts...');
    const transactionCounts = await sequelize.query(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(quantity) as total_quantity
      FROM "Transactions"
      GROUP BY type
      ORDER BY type
    `, { type: QueryTypes.SELECT }) as any[];
    
    const countMap = transactionCounts.reduce((acc, row) => {
      acc[row.type] = { count: parseInt(row.count), total: parseFloat(row.total_quantity) };
      return acc;
    }, {} as any);
    
    // Expected values from migration
    results.push({
      category: 'Total Consumption Transactions',
      expected: 1230,
      actual: countMap.OUT?.count || 0,
      status: countMap.OUT?.count === 1230 ? '✅' : '❌'
    });
    
    results.push({
      category: 'Total Consumption Quantity',
      expected: 175140,
      actual: countMap.OUT?.total || 0,
      status: Math.abs((countMap.OUT?.total || 0) - 175140) < 1 ? '✅' : '❌'
    });
    
    results.push({
      category: 'Total Purchase Transactions',
      expected: 486,
      actual: countMap.IN?.count || 0,
      status: countMap.IN?.count === 486 ? '✅' : '❌'
    });
    
    results.push({
      category: 'Total Purchase Quantity',
      expected: 228472,
      actual: countMap.IN?.total || 0,
      status: Math.abs((countMap.IN?.total || 0) - 228472) < 1 ? '✅' : '❌'
    });
    
    results.push({
      category: 'Total Correction Transactions',
      expected: 15,
      actual: countMap.CORRECTION?.count || 0,
      status: countMap.CORRECTION?.count === 15 ? '✅' : '❌'
    });
    
    results.push({
      category: 'Total Correction Quantity',
      expected: -1379,
      actual: countMap.CORRECTION?.total || 0,
      status: Math.abs((countMap.CORRECTION?.total || 0) - (-1379)) < 1 ? '✅' : '❌'
    });
    
    // 2. Verify Product Count
    console.log('📊 Checking product count...');
    const productCount = await sequelize.query(`
      SELECT COUNT(*) as count FROM "Products"
    `, { type: QueryTypes.SELECT }) as any[];
    
    results.push({
      category: 'Total Products',
      expected: 235,
      actual: parseInt(productCount[0].count),
      status: parseInt(productCount[0].count) === 235 ? '✅' : '❌'
    });
    
    // 3. Verify Monthly Breakdown
    console.log('📊 Checking monthly breakdown...');
    const monthlyData = await sequelize.query(`
      SELECT 
        TO_CHAR(date, 'Month YYYY') as month,
        type,
        COUNT(*) as count,
        SUM(quantity) as total
      FROM "Transactions"
      GROUP BY TO_CHAR(date, 'Month YYYY'), type, DATE_TRUNC('month', date)
      ORDER BY DATE_TRUNC('month', date) DESC, type
    `, { type: QueryTypes.SELECT }) as any[];
    
    // Expected key months
    const expectedMonths = {
      'May 2025 OUT': { count: 162, total: 22511 },
      'May 2025 IN': { count: 45, total: 19811 },
      'April 2025 OUT': { count: 147, total: 24278 },
      'April 2025 CORRECTION': { count: 15, total: -1379 },
      'April 2025 IN': { count: 60, total: 34387 }
    };
    
    const actualMonths = monthlyData.reduce((acc, row) => {
      const key = `${row.month.trim()} ${row.type}`;
      acc[key] = { count: parseInt(row.count), total: parseFloat(row.total) };
      return acc;
    }, {} as any);
    
    Object.entries(expectedMonths).forEach(([key, expected]) => {
      const actual = actualMonths[key];
      results.push({
        category: `${key} Transactions`,
        expected: expected.count,
        actual: actual?.count || 0,
        status: actual?.count === expected.count ? '✅' : '❌'
      });
    });
    
    // 4. Verify Sample Products
    console.log('📊 Checking sample products...');
    const sampleProducts = await sequelize.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        p."currentStock",
        (
          SELECT COUNT(*) 
          FROM "Transactions" t 
          WHERE t."productId" = p.id
        ) as transaction_count
      FROM "Products" p
      WHERE p."artisCodes"[1] IN ('123', '001', '050', '100', '200')
      ORDER BY p."artisCodes"[1]
    `, { type: QueryTypes.SELECT }) as any[];
    
    sampleProducts.forEach(product => {
      results.push({
        category: `Product ${product.artis_code} Stock`,
        expected: '> 0',
        actual: parseFloat(product.currentStock),
        status: parseFloat(product.currentStock) >= 0 ? '✅' : '❌',
        message: `${product.transaction_count} transactions`
      });
    });
    
    // 5. Verify Stock Calculation
    console.log('📊 Verifying stock calculations...');
    const stockCheck = await sequelize.query(`
      SELECT 
        COUNT(*) as products_with_stock,
        COUNT(CASE WHEN "currentStock" < 0 THEN 1 END) as negative_stock,
        COUNT(CASE WHEN "currentStock" = 0 THEN 1 END) as zero_stock,
        COUNT(CASE WHEN "currentStock" > 0 THEN 1 END) as positive_stock
      FROM "Products"
    `, { type: QueryTypes.SELECT }) as any[];
    
    results.push({
      category: 'Products with Negative Stock',
      expected: 0,
      actual: parseInt(stockCheck[0].negative_stock),
      status: parseInt(stockCheck[0].negative_stock) === 0 ? '✅' : '⚠️',
      message: 'Should ideally be 0'
    });
    
    // Print Results
    console.log('\n' + '='.repeat(80));
    console.log('📋 VERIFICATION RESULTS');
    console.log('='.repeat(80) + '\n');
    
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    
    results.forEach(result => {
      const statusSymbol = result.status;
      if (result.status === '✅') passed++;
      else if (result.status === '❌') failed++;
      else warnings++;
      
      console.log(`${statusSymbol} ${result.category}:`);
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Actual: ${result.actual}`);
      if (result.message) console.log(`   Note: ${result.message}`);
      console.log('');
    });
    
    console.log('='.repeat(80));
    console.log(`SUMMARY: ✅ ${passed} passed, ❌ ${failed} failed, ⚠️ ${warnings} warnings`);
    console.log('='.repeat(80));
    
    if (failed === 0) {
      console.log('\n🎉 All critical checks passed! Your sync was successful.');
    } else {
      console.log('\n❌ Some checks failed. Please review the results above.');
    }
    
    // Additional detailed report
    console.log('\n📊 DETAILED DATABASE SUMMARY:');
    console.log('='.repeat(50));
    
    const summary = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM "Products") as total_products,
        (SELECT COUNT(*) FROM "Transactions") as total_transactions,
        (SELECT COUNT(*) FROM "Transactions" WHERE type = 'IN') as total_purchases,
        (SELECT COUNT(*) FROM "Transactions" WHERE type = 'OUT') as total_consumption,
        (SELECT COUNT(*) FROM "Transactions" WHERE type = 'CORRECTION') as total_corrections,
        (SELECT SUM(quantity) FROM "Transactions" WHERE type = 'IN') as total_in_qty,
        (SELECT SUM(quantity) FROM "Transactions" WHERE type = 'OUT') as total_out_qty,
        (SELECT SUM(quantity) FROM "Transactions" WHERE type = 'CORRECTION') as total_correction_qty,
        (SELECT SUM("currentStock") FROM "Products") as total_current_stock
    `, { type: QueryTypes.SELECT }) as any[];
    
    const s = summary[0];
    console.log(`Products: ${s.total_products}`);
    console.log(`Total Transactions: ${s.total_transactions}`);
    console.log(`- Purchases: ${s.total_purchases} (${parseFloat(s.total_in_qty).toFixed(2)} kg)`);
    console.log(`- Consumption: ${s.total_consumption} (${parseFloat(s.total_out_qty).toFixed(2)} kg)`);
    console.log(`- Corrections: ${s.total_corrections} (${parseFloat(s.total_correction_qty || 0).toFixed(2)} kg)`);
    console.log(`Current Total Stock: ${parseFloat(s.total_current_stock).toFixed(2)} kg`);
    console.log(`Net Movement: ${(parseFloat(s.total_in_qty) - parseFloat(s.total_out_qty) + parseFloat(s.total_correction_qty || 0)).toFixed(2)} kg`);
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  verifySync().catch(console.error);
}

export { verifySync };