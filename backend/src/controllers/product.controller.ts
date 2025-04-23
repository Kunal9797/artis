import { Request, Response } from 'express';
import Product from '../models/Product';
import * as XLSX from 'xlsx';
import sequelize from '../config/sequelize';
import { Op } from 'sequelize';
import Transaction from '../models/Transaction';
import { UserRole } from '../models/User';

interface ExcelRow {
  NAME?: string;
  'OUR CODE'?: string;
  'DESIGN CODE'?: string;
  SUPPLIER?: string;
  CATEGORY?: string;
  CATALOGS?: string;
  GSM?: string;
  TEXTURE?: string;
  THICKNESS?: string;
}

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    salesTeamId?: string;
  };
}

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.findAll();
    const sanitizedProducts = products.map(product => ({
      ...product.toJSON(),
      catalogs: product.catalogs || []
    }));
    res.json(sanitizedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    const {
      artisCode,
      supplierCode,
      name,
      category,
      supplier,
      gsm,
      catalogs = []
    } = req.body;

    if (!artisCode || !supplierCode || !supplier) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['artisCode', 'supplierCode', 'supplier']
      });
    }

    // Check if product exists with same supplier/supplierCode
    const existingProduct = await Product.findOne({
      where: {
        supplierCode,
        supplier
      },
      transaction: t
    });

    if (existingProduct) {
      // Check if artisCode already exists in this product
      if (existingProduct.artisCodes.includes(artisCode)) {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Artis code already exists for this product'
        });
      }

      // Merge artisCodes and catalogs arrays
      const mergedCatalogs = [...new Set([...(existingProduct.catalogs || []), ...catalogs])];
      
      // Add new artisCode to existing product
      await existingProduct.update({
        artisCodes: [...existingProduct.artisCodes, artisCode],
        catalogs: mergedCatalogs
      }, { transaction: t });
      
      await t.commit();
      return res.json(existingProduct);
    }

    // Create new product with artisCode in array
    const product = await Product.create({
      artisCodes: [artisCode],
      name,
      category,
      supplierCode,
      supplier,
      gsm,
      catalogs: catalogs || [],
    }, { transaction: t });

    await t.commit();
    res.status(201).json(product);
  } catch (error) {
    await t.rollback();
    console.error('Error creating product:', error);
    res.status(500).json({ 
      error: 'Error creating product',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const bulkCreateProducts = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const updateMode = req.query.mode === 'update';
  const skippedProducts: { artisCode: string; reason: string }[] = [];
  const validProducts: any[] = [];
  const updatedProducts: any[] = [];

  let t;
  try {
    t = await sequelize.transaction();
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
    
    // First pass: group rows by supplierCode and supplier
    const groupedProducts = new Map<string, any>();
    
    for (const row of data) {
      try {
        const artisCode = row['OUR CODE']?.toString() || '';
        const supplierCode = row['DESIGN CODE']?.toString() || '';
        const supplier = row.SUPPLIER?.toString() || '';
        
        if (!artisCode || !supplierCode || !supplier) {
          skippedProducts.push({
            artisCode: artisCode || 'unknown',
            reason: 'Missing required fields'
          });
          continue;
        }

        const key = `${supplierCode}:${supplier}`;
        
        if (!groupedProducts.has(key)) {
          groupedProducts.set(key, {
            name: row.NAME?.toString() || '',
            artisCodes: [artisCode],
            supplierCode,
            supplier,
            category: row.CATEGORY?.toString() || null,
            catalogs: row.CATALOGS ? row.CATALOGS.toString().split(',').map(c => c.trim()) : [],
            gsm: row.GSM?.toString() || null,
            texture: row.TEXTURE?.toString() || null,
            thickness: row.THICKNESS?.toString() || null,
            currentStock: 0,
            avgConsumption: 0,
            lastUpdated: new Date()
          });
        } else {
          const existing = groupedProducts.get(key);
          existing.artisCodes.push(artisCode);
          if (row.CATALOGS) {
            const newCatalogs = row.CATALOGS.toString().split(',').map(c => c.trim());
            existing.catalogs = [...new Set([...existing.catalogs, ...newCatalogs])];
          }
        }
      } catch (error) {
        console.error('Error processing row:', error);
        skippedProducts.push({
          artisCode: row['OUR CODE']?.toString() || 'unknown',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Process grouped products
    for (const product of groupedProducts.values()) {
      try {
        const existing = await Product.findOne({
          where: {
            supplierCode: product.supplierCode,
            supplier: product.supplier
          },
          transaction: t
        });

        if (existing) {
          if (updateMode) {
            const mergedArtisCodes = [...new Set([...existing.artisCodes, ...product.artisCodes])];
            const mergedCatalogs = [...new Set([...(existing.catalogs || []), ...product.catalogs])];
            
            await existing.update({
              ...product,
              artisCodes: mergedArtisCodes,
              catalogs: mergedCatalogs
            }, { transaction: t });
            updatedProducts.push(existing);
          } else {
            skippedProducts.push({
              artisCode: product.artisCodes.join(', '),
              reason: 'Product exists and update mode is off'
            });
          }
        } else {
          validProducts.push(product);
        }
      } catch (error) {
        console.error('Error processing product:', error);
        skippedProducts.push({
          artisCode: product.artisCodes.join(', '),
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (validProducts.length > 0) {
      await Product.bulkCreate(validProducts, { 
        transaction: t,
        validate: true
      });
    }

    await t.commit();

    return res.json({
      message: 'Import completed',
      created: {
        count: validProducts.length,
        products: validProducts
      },
      updated: {
        count: updatedProducts.length,
        products: updatedProducts
      },
      skipped: {
        count: skippedProducts.length,
        products: skippedProducts
      }
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    if (t) await t.rollback();
    return res.status(500).json({
      error: 'Error processing file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getProductByArtisCode = async (req: Request, res: Response) => {
  try {
    const { artisCode } = req.params;
    const product = await Product.findOne({
      where: {
        artisCodes: {
          [Op.contains]: [artisCode]
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error finding product:', error);
    res.status(500).json({ error: 'Failed to find product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    const product = await Product.findByPk(req.params.id, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if new supplierCode+supplier combination already exists
    if (req.body.supplierCode && req.body.supplier) {
      const duplicate = await Product.findOne({
        where: {
          id: { [Op.ne]: req.params.id },
          supplierCode: req.body.supplierCode,
          supplier: req.body.supplier
        },
        transaction: t
      });

      if (duplicate) {
        await t.rollback();
        return res.status(400).json({ 
          error: 'Supplier code already exists for this supplier' 
        });
      }
    }

    await product.update(req.body, { transaction: t });
    await t.commit();
    res.json(product);
  } catch (error) {
    await t.rollback();
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Error updating product' });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Error fetching product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id, { transaction: t });
    
    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { artisCodes: { [Op.contains]: [query] } },
          { name: { [Op.iLike]: `%${query}%` } },
          { supplierCode: { [Op.iLike]: `%${query}%` } },
          { supplier: { [Op.iLike]: `%${query}%` } }
        ]
      }
    });
    
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Error searching products' });
  }
};

export const deleteAllProducts = async (req: AuthRequest, res: Response) => {
  console.log('Delete All Products - Request received');
  console.log('User info:', req.user);
  
  const t = await sequelize.transaction();
  
  try {
    console.log('Starting product deletion');
    const result = await Product.destroy({ 
      where: {},
      truncate: true,
      cascade: true,
      transaction: t 
    });
    
    console.log('Products deleted successfully, count:', result);
    await t.commit();
    res.json({ message: 'All products deleted successfully', count: result });
  } catch (error) {
    console.error('Error in deleteAllProducts:', error);
    await t.rollback();
    res.status(500).json({ error: 'Error deleting all products' });
  }
};

export const updateProductAverageConsumption = async (productId: string, transaction?: any) => {
  try {
    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      throw new Error('Product not found');
    }

    // Get all OUT transactions that should be included in average calculation
    // This explicitly excludes any CORRECTION transactions as they don't have type='OUT'
    const outTransactions = await Transaction.findAll({
      where: {
        productId,
        type: 'OUT',
        includeInAvg: true
      },
      order: [['date', 'ASC']], // Order by date ascending to find first usage
      transaction,
      attributes: ['quantity', 'date']
    });

    console.log(`Found ${outTransactions.length} OUT transactions for product ${productId}`);

    if (outTransactions.length === 0) {
      // No transactions, set average to 0
      await product.update({ avgConsumption: 0 }, { transaction });
      return 0;
    }

    // Find the first transaction with non-zero quantity
    const firstNonZeroIndex = outTransactions.findIndex(t => Number(t.quantity) > 0);
    
    if (firstNonZeroIndex === -1) {
      // No non-zero transactions, set average to 0
      await product.update({ avgConsumption: 0 }, { transaction });
      return 0;
    }

    // Get the date of the first non-zero transaction
    const firstUsageDate = outTransactions[firstNonZeroIndex].date;
    console.log(`First usage date: ${firstUsageDate}`);

    // Filter transactions to only include those after the first usage
    const relevantTransactions = outTransactions.filter(t => 
      new Date(t.date) >= new Date(firstUsageDate)
    );

    console.log(`Relevant transactions count: ${relevantTransactions.length}`);

    // Calculate total quantity from relevant transactions
    const totalOutQuantity = relevantTransactions.reduce((sum, t) => {
      const qty = Number(t.quantity);
      return sum + qty;
    }, 0);

    console.log(`Total OUT quantity: ${totalOutQuantity}`);

    // Group transactions by month to count unique months with data
    const monthsWithData = new Set();
    relevantTransactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthsWithData.add(monthKey);
    });

    const uniqueMonthsCount = monthsWithData.size;
    console.log(`Unique months with data: ${uniqueMonthsCount}`);

    // Calculate average based on unique months with data
    const avgConsumption = uniqueMonthsCount > 0 
      ? Number((totalOutQuantity / uniqueMonthsCount).toFixed(2))
      : 0;
    
    console.log(`Calculated average consumption: ${avgConsumption}`);

    await product.update({ 
      avgConsumption
    }, { transaction });

    return avgConsumption;
  } catch (error) {
    console.error('Error updating average consumption:', error);
    throw error;
  }
}; 