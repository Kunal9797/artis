import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import sequelize from '../config/sequelize';
import { Product, Transaction } from '../models';
import { Op } from 'sequelize';

dotenv.config();

async function carefulFullSync() {
  console.log('🚀 Starting careful full sync...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if any transactions exist
    const existingCount = await Transaction.count();
    if (existingCount > 0) {
      console.log(`⚠️  WARNING: Found ${existingCount} existing transactions!`);
      console.log('Please clear the database first to avoid duplicates.\n');
      return;
    }

    // Pre-load all products into memory
    const products = await Product.findAll();
    const productMap = new Map<string, any>();
    
    products.forEach(product => {
      product.artisCodes.forEach((code: string) => {
        productMap.set(code, product);
      });
    });
    
    console.log(`📦 Loaded ${products.length} products into memory\n`);

    // Track all transactions to detect duplicates
    const transactionSet = new Set<string>();
    let totalAdded = 0;
    let duplicatesSkipped = 0;

    // 1. Sync Consumption Data
    console.log('🔄 Step 1/3: Syncing consumption data...');
    const consResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:D',
    });
    
    const consRows = consResponse.data.values || [];
    console.log(`Found ${consRows.length} consumption rows`);
    
    const consumptionTransactions: any[] = [];
    
    for (const row of consRows) {
      const [artisCode, consumption, month, notes] = row;
      if (!artisCode || !consumption || !month) continue;
      
      const product = productMap.get(artisCode);
      if (!product) {
        console.log(`⚠️  Product not found: ${artisCode}`);
        continue;
      }
      
      // Create unique key for duplicate detection
      const key = `OUT-${product.id}-${month}-${consumption}`;
      if (transactionSet.has(key)) {
        duplicatesSkipped++;
        continue;
      }
      transactionSet.add(key);
      
      const monthDate = new Date(`${month} 1`);
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      consumptionTransactions.push({
        productId: product.id,
        type: 'OUT',
        quantity: parseFloat(consumption),
        date: lastDay,
        notes: notes || `Monthly consumption for ${month}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    if (consumptionTransactions.length > 0) {
      await Transaction.bulkCreate(consumptionTransactions);
      totalAdded += consumptionTransactions.length;
      console.log(`✅ Added ${consumptionTransactions.length} consumption records\n`);
    }

    // 2. Sync Purchases Data
    console.log('🔄 Step 2/3: Syncing purchases data...');
    const purchResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:D',
    });
    
    const purchRows = purchResponse.data.values || [];
    console.log(`Found ${purchRows.length} purchase rows`);
    
    const purchaseTransactions: any[] = [];
    
    for (const row of purchRows) {
      const [artisCode, date, amount, notes] = row;
      
      if (!artisCode || !date || !amount) continue;
      if (artisCode.includes('Example:') || artisCode.includes('Instructions:')) continue;
      
      const product = productMap.get(artisCode);
      if (!product) {
        console.log(`⚠️  Product not found: ${artisCode}`);
        continue;
      }
      
      // Create unique key for duplicate detection
      const key = `IN-${product.id}-${date}-${amount}`;
      if (transactionSet.has(key)) {
        duplicatesSkipped++;
        continue;
      }
      transactionSet.add(key);
      
      purchaseTransactions.push({
        productId: product.id,
        type: 'IN',
        quantity: parseFloat(amount),
        date: new Date(date),
        notes: notes || 'Purchase',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    if (purchaseTransactions.length > 0) {
      await Transaction.bulkCreate(purchaseTransactions);
      totalAdded += purchaseTransactions.length;
      console.log(`✅ Added ${purchaseTransactions.length} purchase records\n`);
    }

    // 3. Sync Corrections Data
    console.log('🔄 Step 3/3: Syncing corrections data...');
    const corrResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
      range: 'Sheet1!A2:E',
    });
    
    const corrRows = corrResponse.data.values || [];
    console.log(`Found ${corrRows.length} correction rows`);
    
    const correctionTransactions: any[] = [];
    
    for (const row of corrRows) {
      const [artisCode, correctionAmount, type, dateApplied, reason] = row;
      
      if (!artisCode || !correctionAmount) continue;
      if (artisCode.includes('Example:') || artisCode.includes('Instructions:')) continue;
      
      const product = productMap.get(artisCode);
      if (!product) {
        console.log(`⚠️  Product not found: ${artisCode}`);
        continue;
      }
      
      const amount = parseFloat(correctionAmount.replace(/[^0-9.-]/g, ''));
      const isPositive = correctionAmount.includes('+') || amount > 0;
      
      // Create unique key for duplicate detection
      const key = `CORR-${product.id}-${dateApplied || 'nodate'}-${amount}`;
      if (transactionSet.has(key)) {
        duplicatesSkipped++;
        continue;
      }
      transactionSet.add(key);
      
      correctionTransactions.push({
        productId: product.id,
        type: isPositive ? 'IN' : 'OUT',
        quantity: Math.abs(amount),
        date: dateApplied ? new Date(dateApplied) : new Date(),
        notes: `CORRECTION: ${type || 'Stock Adjustment'}. ${reason || ''}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    if (correctionTransactions.length > 0) {
      await Transaction.bulkCreate(correctionTransactions);
      totalAdded += correctionTransactions.length;
      console.log(`✅ Added ${correctionTransactions.length} correction records\n`);
    }

    console.log(`📊 Sync Summary:`);
    console.log(`   Total added: ${totalAdded}`);
    console.log(`   Duplicates skipped: ${duplicatesSkipped}\n`);

    // 4. Recalculate all product stocks
    console.log('📊 Recalculating product stocks...');
    
    let productsUpdated = 0;
    for (const product of products) {
      const transactions = await Transaction.findAll({
        where: { productId: product.id },
        order: [['date', 'ASC'], ['id', 'ASC']]
      });
      
      let currentStock = 0;
      for (const transaction of transactions) {
        if (transaction.type === 'IN') {
          currentStock += transaction.quantity;
        } else if (transaction.type === 'OUT') {
          currentStock -= transaction.quantity;
        }
      }
      
      if (currentStock !== product.currentStock) {
        await product.update({ currentStock: Math.max(0, currentStock) });
        productsUpdated++;
      }
    }
    
    console.log(`✅ Updated stock for ${productsUpdated} products\n`);
    
    // Final verification
    const summary = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT "productId") as products_with_transactions,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN type = 'IN' THEN 1 ELSE 0 END) as total_in_count,
        SUM(CASE WHEN type = 'OUT' THEN 1 ELSE 0 END) as total_out_count,
        SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as total_in_qty,
        SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as total_out_qty
      FROM "Transactions"
    `);
    
    console.log('📊 Final Database Summary:');
    const stats = summary[0][0] as any;
    console.log(`   Products with transactions: ${stats.products_with_transactions}`);
    console.log(`   Total transactions: ${stats.total_transactions}`);
    console.log(`   IN transactions: ${stats.total_in_count} (${parseFloat(stats.total_in_qty).toFixed(2)} kg)`);
    console.log(`   OUT transactions: ${stats.total_out_count} (${parseFloat(stats.total_out_qty).toFixed(2)} kg)`);
    
    console.log('\n✅ Careful sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  carefulFullSync().catch(console.error);
}

export { carefulFullSync };