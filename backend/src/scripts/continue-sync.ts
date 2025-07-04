import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import sequelize from '../config/sequelize';
import { Product, Transaction } from '../models';
import { Op } from 'sequelize';

dotenv.config();

async function continueSync() {
  console.log('🚀 Continuing sync (purchases and corrections)...\n');
  
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

    // Pre-load all products into memory
    const products = await Product.findAll();
    const productMap = new Map<string, any>();
    
    products.forEach(product => {
      product.artisCodes.forEach((code: string) => {
        productMap.set(code, product);
      });
    });
    
    console.log(`📦 Loaded ${products.length} products into memory\n`);

    // 1. Sync Purchases - WITH CORRECT COLUMN MAPPING
    console.log('🔄 Syncing purchases data...');
    const purchResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:D', // Only 4 columns: Artis Code, Date, Amount, Notes
    });
    
    const purchRows = purchResponse.data.values || [];
    const purchaseTransactions: any[] = [];
    
    for (const row of purchRows) {
      // CORRECT COLUMN ORDER: Artis Code, Date, Amount (kg), Notes
      const [artisCode, date, amount, notes] = row;
      
      if (!artisCode || !date || !amount) continue;
      if (artisCode.includes('Example:') || artisCode.includes('Instructions:')) continue;
      
      const product = productMap.get(artisCode);
      if (!product) {
        console.log(`⚠️  Product not found: ${artisCode}`);
        continue;
      }
      
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
      console.log(`✅ Added ${purchaseTransactions.length} purchase records\n`);
    }

    // 2. Sync Corrections
    console.log('🔄 Syncing corrections data...');
    const corrResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
      range: 'Sheet1!A2:E',
    });
    
    const corrRows = corrResponse.data.values || [];
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
      console.log(`✅ Added ${correctionTransactions.length} correction records\n`);
    }

    // 3. Recalculate all product stocks
    console.log('📊 Recalculating product stocks...');
    
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
      
      await product.update({ currentStock: Math.max(0, currentStock) });
    }
    
    console.log('✅ All product stocks recalculated\n');
    
    // Get summary
    const summary = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT "productId") as products_with_transactions,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN type = 'IN' THEN quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN type = 'OUT' THEN quantity ELSE 0 END) as total_out
      FROM "Transactions"
    `);
    
    console.log('📊 Summary:', summary[0][0]);
    console.log('\n✅ Sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  continueSync().catch(console.error);
}

export { continueSync };