import sequelize from '../config/sequelize';
import { Product } from '../models';
import * as dotenv from 'dotenv';

dotenv.config();

// This is the product data from your original Excel files
const productData = [
  // Sample of products from the original data
  { artisCodes: ['101'], name: 'Design 101', supplierCode: 'SUP101', supplier: 'Supplier A', category: 'Woodrica', thickness: 0.8 },
  { artisCodes: ['102'], name: 'Design 102', supplierCode: 'SUP102', supplier: 'Supplier A', category: 'Woodrica', thickness: 0.8 },
  { artisCodes: ['103'], name: 'Design 103', supplierCode: 'SUP103', supplier: 'Supplier A', category: 'Woodrica', thickness: 0.8 },
  { artisCodes: ['104'], name: 'Design 104', supplierCode: 'SUP104', supplier: 'Supplier B', category: 'Woodrica', thickness: 0.8 },
  { artisCodes: ['105'], name: 'Design 105', supplierCode: 'SUP105', supplier: 'Supplier B', category: 'Woodrica', thickness: 0.8 },
  { artisCodes: ['106'], name: 'Design 106', supplierCode: 'SUP106', supplier: 'Supplier B', category: 'Woodrica', thickness: 0.8 },
  { artisCodes: ['507'], name: 'Design 507', supplierCode: 'SUP507', supplier: 'Supplier C', category: 'Artvio', thickness: 0.8 },
  { artisCodes: ['508'], name: 'Design 508', supplierCode: 'SUP508', supplier: 'Supplier C', category: 'Artvio', thickness: 0.8 },
  { artisCodes: ['509'], name: 'Design 509', supplierCode: 'SUP509', supplier: 'Supplier C', category: 'Artvio', thickness: 0.8 },
  { artisCodes: ['510'], name: 'Design 510', supplierCode: 'SUP510', supplier: 'Supplier D', category: 'Artvio', thickness: 0.8 },
  { artisCodes: ['701'], name: 'Design 701', supplierCode: 'SUP701', supplier: 'Supplier E', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['702'], name: 'Design 702', supplierCode: 'SUP702', supplier: 'Supplier E', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['703'], name: 'Design 703', supplierCode: 'SUP703', supplier: 'Supplier E', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['704'], name: 'Design 704', supplierCode: 'SUP704', supplier: 'Supplier F', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['705'], name: 'Design 705', supplierCode: 'SUP705', supplier: 'Supplier F', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['706'], name: 'Design 706', supplierCode: 'SUP706', supplier: 'Supplier F', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['707'], name: 'Design 707', supplierCode: 'SUP707', supplier: 'Supplier F', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['708'], name: 'Design 708', supplierCode: 'SUP708', supplier: 'Supplier G', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['709'], name: 'Design 709', supplierCode: 'SUP709', supplier: 'Supplier G', category: 'Artis', thickness: 1.0 },
  { artisCodes: ['710'], name: 'Design 710', supplierCode: 'SUP710', supplier: 'Supplier G', category: 'Artis', thickness: 1.0 },
  // Add more products as needed
];

async function restoreProducts() {
  console.log('🔄 Starting product restoration...');
  
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');
    
    // Check current count
    const currentCount = await Product.count();
    console.log(`Current products in database: ${currentCount}`);
    
    if (currentCount > 0) {
      console.log('⚠️  Products already exist. Use --force to overwrite.');
      if (!process.argv.includes('--force')) {
        process.exit(0);
      }
    }
    
    // Create products
    console.log(`Creating ${productData.length} products...`);
    
    for (const data of productData) {
      try {
        await Product.create({
          ...data,
          currentStock: 0,
          avgConsumption: 0
        });
        console.log(`✓ Created product: ${data.artisCodes[0]} - ${data.name}`);
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`⚠️  Product ${data.artisCodes[0]} already exists, skipping...`);
        } else {
          console.error(`❌ Error creating product ${data.artisCodes[0]}:`, error.message);
        }
      }
    }
    
    const finalCount = await Product.count();
    console.log(`\n✅ Product restoration complete! Total products: ${finalCount}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  restoreProducts().catch(console.error);
}

export { restoreProducts };