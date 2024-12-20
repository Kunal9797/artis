import { Request, Response } from 'express';
import Product from '../models/Product';
import { InventoryType, MeasurementUnit } from '../models/Product';

export const createLaminateSheet = async (req: Request, res: Response) => {
  try {
    const {
      artisCode,
      name,
      texture,
      thickness,
      designPaperId,
    } = req.body;

    // Validate required fields
    if (!artisCode || !name || !designPaperId || !texture || !thickness) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['artisCode', 'name', 'designPaperId', 'texture', 'thickness']
      });
    }

    // Verify and get design paper
    const designPaper = await Product.findByPk(designPaperId);
    if (!designPaper || designPaper.inventoryType !== InventoryType.DESIGN_PAPER_SHEET) {
      return res.status(400).json({ 
        error: 'Invalid design paper reference'
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
      category: designPaper.category, // Copy category from design paper
      texture,
      thickness,
      designPaperId,
      inventoryType: InventoryType.LAMINATE_SHEET,
      measurementUnit: MeasurementUnit.UNITS
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating laminate sheet:', error);
    res.status(500).json({ 
      error: 'Error creating laminate sheet',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 