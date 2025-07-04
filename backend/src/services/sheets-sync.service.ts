import { GoogleSheetsService } from './google-sheets.service';
import { Transaction, Product } from '../models';
import { Op } from 'sequelize';

interface MonthlyData {
  artisCode: string;
  month: string;
  consumption: number;
  purchases: number;
}

export class SheetsSyncService {
  private sheetsService: GoogleSheetsService;

  constructor(sheetsService: GoogleSheetsService) {
    this.sheetsService = sheetsService;
  }

  /**
   * Pull data from Google Sheets and sync to Supabase
   */
  async syncFromSheets(): Promise<{
    added: number;
    updated: number;
    errors: string[];
  }> {
    const results = {
      added: 0,
      updated: 0,
      errors: [] as string[]
    };

    try {
      // Get data from Google Sheets
      const sheetData = await this.sheetsService.getInventorySnapshot();
      
      // Skip header row
      const dataRows = sheetData.slice(1);
      
      for (const row of dataRows) {
        try {
          const [artisCode, month, consumption, purchases] = row;
          
          if (!artisCode || !month) continue;
          
          // Find product
          const product = await Product.findOne({
            where: { artisCodes: { [Op.contains]: [artisCode] } }
          });
          
          if (!product) {
            results.errors.push(`Product not found: ${artisCode}`);
            continue;
          }
          
          // Parse month (YYYY-MM format)
          const [year, monthNum] = month.split('-');
          const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
          const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
          
          // Check existing transactions for this month
          const existingTransactions = await Transaction.findAll({
            where: {
              productId: product.id,
              date: {
                [Op.gte]: startDate,
                [Op.lte]: endDate
              }
            }
          });
          
          // Add consumption if not exists
          if (consumption > 0) {
            const hasConsumption = existingTransactions.some(t => t.type === 'OUT');
            if (!hasConsumption) {
              await Transaction.create({
                productId: product.id,
                type: 'OUT',
                quantity: parseFloat(consumption),
                date: endDate, // Use month end for consumption
                notes: 'Imported from Google Sheets'
              });
              results.added++;
            }
          }
          
          // Add purchases if not exists
          if (purchases > 0) {
            const hasPurchase = existingTransactions.some(t => t.type === 'IN');
            if (!hasPurchase) {
              await Transaction.create({
                productId: product.id,
                type: 'IN',
                quantity: parseFloat(purchases),
                date: new Date(parseInt(year), parseInt(monthNum) - 1, 15), // Mid-month for purchases
                notes: 'Imported from Google Sheets'
              });
              results.added++;
            }
          }
          
        } catch (error) {
          results.errors.push(`Error processing row: ${error}`);
        }
      }
      
      return results;
      
    } catch (error) {
      throw new Error(`Sync failed: ${error}`);
    }
  }

  /**
   * Export current month's template to Google Sheets
   */
  async exportMonthlyTemplate(): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Get all products
    const products = await Product.findAll({
      order: [['artisCodes', 'ASC']]
    });
    
    // Create template data
    const templateData = [
      ['Artis Code', 'Month', 'Consumption', 'Purchases', 'Notes'],
      ...products.map(p => [
        p.artisCodes[0],
        currentMonth,
        '', // Empty for user to fill
        '', // Empty for user to fill
        ''
      ])
    ];
    
    // Update sheet
    await this.sheetsService.updateInventoryData(
      templateData,
      'Monthly Entry'
    );
  }

  /**
   * Create monthly summary in Google Sheets
   */
  async createMonthlySummary(): Promise<void> {
    // Get last 12 months of data
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const transactions = await Transaction.findAll({
      where: {
        date: { [Op.gte]: startDate }
      },
      include: [Product],
      order: [['date', 'ASC']]
    });
    
    // Aggregate by month and product
    const monthlyData = new Map<string, MonthlyData>();
    
    transactions.forEach(transaction => {
      const product = (transaction as any).product;
      const monthKey = transaction.date.toISOString().slice(0, 7);
      const key = `${product.artisCodes[0]}-${monthKey}`;
      
      if (!monthlyData.has(key)) {
        monthlyData.set(key, {
          artisCode: product.artisCodes[0],
          month: monthKey,
          consumption: 0,
          purchases: 0
        });
      }
      
      const data = monthlyData.get(key)!;
      if (transaction.type === 'OUT') {
        data.consumption += transaction.quantity;
      } else if (transaction.type === 'IN') {
        data.purchases += transaction.quantity;
      }
    });
    
    // Convert to array and sort
    const summaryData = Array.from(monthlyData.values())
      .sort((a, b) => {
        if (a.month !== b.month) return a.month.localeCompare(b.month);
        return a.artisCode.localeCompare(b.artisCode);
      });
    
    // Update sheet
    const sheetData = [
      ['Artis Code', 'Month', 'Total Consumption', 'Total Purchases'],
      ...summaryData.map(d => [
        d.artisCode,
        d.month,
        d.consumption,
        d.purchases
      ])
    ];
    
    await this.sheetsService.updateInventoryData(
      sheetData,
      'Monthly Summary'
    );
  }
}