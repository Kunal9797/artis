import { Request, Response } from 'express';
import Product from '../models/Product';
import * as XLSX from 'xlsx';
import { InventoryType } from '../models/Product';
import sequelize from '../config/database';

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error fetching products' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      artisCode,
      supplierCode,
      name,
      category,
      supplier,
      gsm,
      catalogs
    } = req.body;

    if (!artisCode) {
      return res.status(400).json({ 
        error: 'Missing required field',
        required: ['artisCode']
      });
    }

    const existing = await Product.findOne({ where: { artisCode } });
    if (existing) {
      return res.status(400).json({ 
        error: 'Product artisCode already exists'
      });
    }

    const product = await Product.create({
      artisCode,
      name,
      category,
      supplierCode,
      supplier,
      gsm,
      catalogs,
      inventoryType: InventoryType.DESIGN_PAPER_SHEET
    });

    res.status(201).json(product);
  } catch (error) {
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
  const t = await sequelize.transaction();
  const skippedProducts: { artisCode: string; reason: string }[] = [];
  const validProducts: any[] = [];
  const updatedProducts: any[] = [];

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // First pass: check for duplicates within the Excel file
    const artisCodesInFile = new Set<string>();
    data.forEach((row: any) => {
      const artisCode = row['OUR CODE']?.toString();
      if (artisCodesInFile.has(artisCode)) {
        skippedProducts.push({ 
          artisCode, 
          reason: 'Duplicate entry in Excel file' 
        });
      }
      artisCodesInFile.add(artisCode);
    });

    // Second pass: process each row
    await Promise.all(data.map(async (row: any) => {
      const product = {
        name: row.NAME || null,
        artisCode: row['OUR CODE']?.toString(),
        supplierCode: row['DESIGN CODE'] || null,
        supplier: row.SUPPLIER || null,
        category: row.CATEGORY || null,
        catalogs: row.CATALOGS ? row.CATALOGS.split(',').map((c: string) => c.trim()) : null,
        gsm: row.GSM?.toString() || null,
        inventoryType: InventoryType.DESIGN_PAPER_SHEET
      };

      if (!product.artisCode) {
        skippedProducts.push({ 
          artisCode: 'unknown', 
          reason: 'Missing required field: artisCode' 
        });
        return;
      }

      const existing = await Product.findOne({ 
        where: { artisCode: product.artisCode }
      });
      
      if (existing) {
        if (updateMode) {
          await Product.update(product, { 
            where: { artisCode: product.artisCode },
            transaction: t 
          });
          updatedProducts.push(product);
        } else {
          skippedProducts.push({ 
            artisCode: product.artisCode, 
            reason: 'Already exists in database' 
          });
        }
        return;
      }

      validProducts.push(product);
    }));

    let createdProducts: Product[] = [];
    if (validProducts.length > 0) {
      createdProducts = await Product.bulkCreate(validProducts, { transaction: t });
    }
    
    if (validProducts.length > 0 || updatedProducts.length > 0) {
      await t.commit();
    } else {
      await t.rollback();
    }

    res.status(201).json({
      message: 'Import completed',
      created: {
        count: createdProducts.length,
        products: createdProducts
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
    await t.rollback();
    console.error('Error importing products:', error);
    res.status(500).json({ 
      error: 'Error importing products',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 