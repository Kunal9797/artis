import { Request, Response } from 'express';
import Product from '../models/Product';
import { InventoryType, MeasurementUnit } from '../models/Product';

export const createDesignPaper = async (req: Request, res: Response) => {
  try {
    const {
      artisCode,
      name,
      category,
      supplierCode,
      supplier,
    } = req.body;

    // Validate required fields
    if (!artisCode || !name || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['artisCode', 'name', 'category']
      });
    }

    // Check for duplicate artisCode
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
      inventoryType: InventoryType.DESIGN_PAPER_SHEET,
      measurementUnit: MeasurementUnit.WEIGHT
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating design paper:', error);
    res.status(500).json({ 
      error: 'Error creating design paper',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 