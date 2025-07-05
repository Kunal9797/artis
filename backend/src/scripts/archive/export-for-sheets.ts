import { Product, Transaction } from '../models';
import sequelize from '../config/sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { Op, QueryTypes } from 'sequelize';

async function exportForSheets() {
  console.log('📊 Exporting data for Google Sheets...\n');

  try {
    await sequelize.authenticate();
    
    // Create export directory
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }
    
    // 1. Export Monthly Consumption Summary
    console.log('📝 Exporting consumption summary...');
    const consumptionData = await sequelize.query(`
      SELECT 
        p."artisCodes"[1] as artis_code,
        DATE_TRUNC('month', t.date) as month,
        SUM(t.quantity) as total_consumption
      FROM "Transactions" t
      JOIN "Products" p ON t."productId" = p.id
      WHERE t.type = 'OUT'
      GROUP BY p.id, p."artisCodes", DATE_TRUNC('month', t.date)
      ORDER BY month DESC, artis_code
    `, { type: QueryTypes.SELECT });
    
    // Group by month for consumption sheet format
    const consumptionByMonth: any = {};
    for (const row of consumptionData as any[]) {
      const monthStr = new Date(row.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!consumptionByMonth[monthStr]) {
        consumptionByMonth[monthStr] = [];
      }
      consumptionByMonth[monthStr].push({
        artisCode: row.artis_code,
        consumption: parseFloat(row.total_consumption).toFixed(2)
      });
    }
    
    // Write consumption files
    for (const [month, data] of Object.entries(consumptionByMonth)) {
      const filename = `consumption_${month.replace(' ', '_')}.csv`;
      const csvContent = 'Artis Code,Consumption (kg),Month,Notes\n' +
        (data as any[]).map(d => `${d.artisCode},${d.consumption},${month},Migrated data`).join('\n');
      
      fs.writeFileSync(path.join(exportDir, filename), csvContent);
      console.log(`✅ Created ${filename}`);
    }
    
    // 2. Export All Purchases
    console.log('\n📝 Exporting purchases...');
    const purchases = await Transaction.findAll({
      where: { type: 'IN' },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['artisCodes']
      }],
      order: [['date', 'DESC']]
    });
    
    const purchasesCsv = 'Artis Code,Date,Amount (kg),Supplier,Notes\n' +
      purchases.map(p => {
        const artisCode = (p as any).product?.artisCodes?.[0] || '';
        const date = p.date.toISOString().split('T')[0];
        const amount = p.quantity.toFixed(2);
        const notes = p.notes || 'Migrated data';
        // Extract supplier from notes if available
        const supplierMatch = notes.match(/Supplier: ([^.]+)/);
        const supplier = supplierMatch ? supplierMatch[1] : 'Unknown';
        
        return `${artisCode},${date},${amount},${supplier},"${notes}"`;
      }).join('\n');
    
    fs.writeFileSync(path.join(exportDir, 'all_purchases.csv'), purchasesCsv);
    console.log('✅ Created all_purchases.csv');
    
    // 3. Export Current Stock Summary
    console.log('\n📝 Exporting current stock...');
    const products = await Product.findAll({
      attributes: ['artisCodes', 'currentStock'],
      order: [['artisCodes', 'ASC']]
    });
    
    const stockCsv = 'Artis Code,Current Stock (kg),Initial Stock (kg),Notes\n' +
      products.map(p => {
        const artisCode = p.artisCodes[0] || '';
        const currentStock = p.currentStock || 0;
        return `${artisCode},${currentStock},,Set initial stock if needed`;
      }).join('\n');
    
    fs.writeFileSync(path.join(exportDir, 'current_stock.csv'), stockCsv);
    console.log('✅ Created current_stock.csv');
    
    // 4. Summary Report
    console.log('\n📊 Export Summary:');
    console.log(`- Total products: ${products.length}`);
    console.log(`- Total purchases: ${purchases.length}`);
    console.log(`- Consumption months: ${Object.keys(consumptionByMonth).length}`);
    console.log(`\n📁 Files saved to: ${exportDir}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. Open each CSV file');
    console.log('2. Copy the data (without headers)');
    console.log('3. Paste into the corresponding Google Sheet');
    console.log('4. Sync from the app to import into database');
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  exportForSheets().catch(console.error);
}

export { exportForSheets };