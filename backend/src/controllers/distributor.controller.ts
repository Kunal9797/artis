import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import Distributor from '../models/Distributor';

interface DistributorRow {
  name: string;
  city: string;
  state: string;
  phoneNumber: string;
  catalog: string;
}

export const importDistributors = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<DistributorRow>(worksheet, { 
      raw: false,
      defval: ''
    });

    const results = [];
    const errors = [];

    for (const row of data) {
      try {
        const distributor = {
          name: row.name,
          city: row.city,
          state: row.state,
          phoneNumber: row.phoneNumber.toString(),
          catalogs: row.catalog.split(',').map(c => c.trim()).filter(c => c),
        };

        const created = await Distributor.create(distributor);
        results.push(created);
      } catch (error: any) {
        errors.push(`Error processing ${row.name}: ${error.message}`);
      }
    }

    res.json({ 
      message: 'Import completed',
      success: results.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing distributors:', error);
    res.status(500).json({ error: 'Error importing distributors' });
  }
};

export const getAllDistributors = async (req: Request, res: Response) => {
  try {
    const distributors = await Distributor.findAll();
    res.json(distributors);
  } catch (error) {
    console.error('Error fetching distributors:', error);
    res.status(500).json({ error: 'Error fetching distributors' });
  }
};

export const createTestDistributor = async (req: Request, res: Response) => {
  try {
    const testDistributor = await Distributor.create({
      name: "Test Distributor",
      city: "Mumbai",
      state: "Maharashtra",
      phoneNumber: "1234567890",
      catalogs: ["Match Graphics", "Surface Décor"]
    });
    res.json(testDistributor);
  } catch (error) {
    console.error('Error creating test distributor:', error);
    res.status(500).json({ error: 'Error creating test distributor' });
  }
};

export const deleteAllDistributors = async (req: Request, res: Response) => {
  try {
    await Distributor.destroy({ where: {} });
    res.json({ message: 'All distributors deleted successfully' });
  } catch (error) {
    console.error('Error deleting distributors:', error);
    res.status(500).json({ error: 'Error deleting distributors' });
  }
}; 