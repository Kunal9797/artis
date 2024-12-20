import { Request, Response } from 'express';
import Product from '../models/Product';
import * as XLSX from 'xlsx';
import { InventoryType, MeasurementUnit } from '../models/Product';

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.findAll({
      include: [{
        model: Product,
        as: 'designPaper',
        attributes: ['artisCode']
      }]
    });
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
      texture,
      thickness,
      inventoryType,
      measurementUnit,
      designPaperId
    } = req.body;

    console.log('Received product data:', req.body);

    // Validate required fields
    if (!artisCode || !name || !inventoryType || !measurementUnit) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['artisCode', 'name', 'inventoryType', 'measurementUnit']
      });
    }

    // Validate design paper fields
    if (inventoryType === InventoryType.DESIGN_PAPER_SHEET && !category) {
      return res.status(400).json({ 
        error: 'Category is required for design papers'
      });
    }

    // If it's a laminate sheet, validate design paper reference
    if (inventoryType === InventoryType.LAMINATE_SHEET) {
      if (!designPaperId) {
        return res.status(400).json({ 
          error: 'Design paper reference is required for laminate sheets'
        });
      }

      const designPaper = await Product.findByPk(designPaperId);
      if (!designPaper || designPaper.inventoryType !== InventoryType.DESIGN_PAPER_SHEET) {
        return res.status(400).json({ 
          error: 'Invalid design paper reference'
        });
      }
    }

    // Check for duplicate artisCode
    const existingProduct = await Product.findOne({ where: { artisCode } });
    if (existingProduct) {
      return res.status(400).json({ 
        error: 'Product artisCode already exists'
      });
    }

    const product = await Product.create({
      artisCode,
      supplierCode,
      name,
      category,
      supplier,
      texture,
      thickness,
      inventoryType,
      measurementUnit,
      designPaperId
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

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await product.update(req.body);
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Error updating product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Error deleting product' });
  }
};

export const bulkCreateProducts = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Validate and transform the data
    const products = await Promise.all(data.map(async (row: any) => {
      // Validate required fields
      if (!row.artisCode || !row.name || !row.inventoryType || !row.measurementUnit) {
        throw new Error(`Missing required fields for product ${row.artisCode || 'unknown'}`);
      }

      // Check if this is a laminate sheet that references a design paper
      if (row.inventoryType === InventoryType.LAMINATE_SHEET && row.designPaper) {
        // Verify the referenced design paper exists
        const designPaper = await Product.findOne({ 
          where: { 
            artisCode: row.designPaper,
            inventoryType: InventoryType.DESIGN_PAPER_SHEET
          }
        });
        
        if (!designPaper) {
          throw new Error(`Design paper with code ${row.designPaper} not found`);
        }

        // For laminate sheets, copy category from design paper
        row.category = designPaper.category;
      }

      // Check for duplicate artisCode
      const existing = await Product.findOne({ where: { artisCode: row.artisCode } });
      if (existing) {
        throw new Error(`Product with artisCode ${row.artisCode} already exists`);
      }

      return {
        artisCode: row.artisCode,
        supplierCode: row.supplierCode,
        name: row.name,
        category: row.category,
        supplier: row.supplier,
        texture: row.texture,
        thickness: row.thickness,
        inventoryType: row.inventoryType,
        measurementUnit: row.measurementUnit,
        designPaperId: row.designPaper ? 
          (await Product.findOne({ 
            where: { artisCode: row.designPaper } 
          }))?.id : null
      };
    }));

    await Product.bulkCreate(products);
    res.status(201).json({ 
      message: 'Products imported successfully',
      count: products.length 
    });
  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ 
      error: 'Error importing products',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 