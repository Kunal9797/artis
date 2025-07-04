import * as XLSX from 'xlsx';
import { google } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

interface ConsolidatedData {
  consumption: Array<{
    designCode: string;
    date: Date;
    quantity: number;
    source: string;
  }>;
  purchases: Array<{
    artisCode: string;
    date: Date;
    amount: number;
    notes?: string;
    source: string;
  }>;
  initialInventory: Array<{
    designCode: string;
    openingStock: number;
    source: string;
  }>;
}

export class ExcelConsolidator {
  private dataPath: string;

  constructor(dataPath: string = '/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data') {
    this.dataPath = dataPath;
  }

  /**
   * Parse various date formats found in Excel files
   */
  private parseDate(dateValue: any): Date | null {
    if (!dateValue) return null;

    // Handle Excel serial numbers
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    }

    // Handle string dates
    if (typeof dateValue === 'string') {
      // Try different date formats
      const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/, // DD/MM/YY or MM/DD/YY
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      ];

      for (const format of formats) {
        const match = dateValue.match(format);
        if (match) {
          // Assume DD/MM/YY for consumption, MM/DD/YY for purchases
          // This is based on the analysis
          return new Date(dateValue);
        }
      }
    }

    return null;
  }

  /**
   * Consolidate all consumption files
   */
  async consolidateConsumption(): Promise<ConsolidatedData['consumption']> {
    const consumptionPath = path.join(this.dataPath, 'Consumption');
    const files = fs.readdirSync(consumptionPath).filter(f => f.endsWith('.xlsx'));
    const allData: ConsolidatedData['consumption'] = [];

    for (const file of files) {
      const filePath = path.join(consumptionPath, file);
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets['Inventory'] || workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Skip header row and date row
      for (let i = 2; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row[1]) continue; // Skip empty rows

        const designCode = String(row[1]);
        
        // Process monthly columns (starting from column 2)
        for (let j = 2; j < row.length; j++) {
          if (row[j] && Number(row[j]) > 0) {
            // Get date from second row (row index 1)
            const dateValue = (data[1] as any[])[j];
            const date = this.parseDate(dateValue);
            
            if (date) {
              allData.push({
                designCode,
                date,
                quantity: Number(row[j]),
                source: file
              });
            }
          }
        }
      }
    }

    return allData;
  }

  /**
   * Consolidate all purchase files
   */
  async consolidatePurchases(): Promise<ConsolidatedData['purchases']> {
    const purchasePath = path.join(this.dataPath, 'Purchase');
    const files = fs.readdirSync(purchasePath).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
    const allData: ConsolidatedData['purchases'] = [];

    for (const file of files) {
      const filePath = path.join(purchasePath, file);
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets['Purchase Order'] || workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      for (const row of data as any[]) {
        const artisCode = String(row['Artis Code'] || row['ARTIS CODE'] || '');
        const dateValue = row['Date'] || row['DATE'];
        const amount = Number(row['Amount (Kgs)'] || row['AMOUNT (KGS)'] || 0);
        const notes = String(row['Notes'] || row['NOTES'] || '');

        const date = this.parseDate(dateValue);
        if (date && artisCode && amount > 0) {
          allData.push({
            artisCode,
            date,
            amount,
            notes: notes || undefined,
            source: file
          });
        }
      }
    }

    return allData;
  }

  /**
   * Create standardized Excel template
   */
  createStandardizedTemplates(): void {
    const templatesPath = path.join(this.dataPath, 'Templates');
    if (!fs.existsSync(templatesPath)) {
      fs.mkdirSync(templatesPath, { recursive: true });
    }

    // Consumption Template
    const consumptionWB = XLSX.utils.book_new();
    const consumptionData = [
      ['Design Code', 'Date', 'Quantity (Kgs)', 'Notes'],
      ['Example: 101', '2025-01-15', '100', 'Monthly consumption'],
      ['Example: 102', '2025-01-15', '50', 'Monthly consumption']
    ];
    const consumptionWS = XLSX.utils.aoa_to_sheet(consumptionData);
    XLSX.utils.book_append_sheet(consumptionWB, consumptionWS, 'Consumption');
    XLSX.writeFile(consumptionWB, path.join(templatesPath, 'consumption_template.xlsx'));

    // Purchase Template
    const purchaseWB = XLSX.utils.book_new();
    const purchaseData = [
      ['Artis Code', 'Date', 'Amount (Kgs)', 'Supplier', 'Notes'],
      ['Example: 101', '2025-01-15', '500', 'Supplier A', 'Purchase order #123'],
      ['Example: 102', '2025-01-15', '300', 'Supplier B', 'Purchase order #124']
    ];
    const purchaseWS = XLSX.utils.aoa_to_sheet(purchaseData);
    XLSX.utils.book_append_sheet(purchaseWB, purchaseWS, 'Purchases');
    XLSX.writeFile(purchaseWB, path.join(templatesPath, 'purchase_template.xlsx'));
  }

  /**
   * Export consolidated data to a single Excel file
   */
  async exportConsolidatedExcel(outputPath: string): Promise<void> {
    const consumption = await this.consolidateConsumption();
    const purchases = await this.consolidatePurchases();

    const workbook = XLSX.utils.book_new();

    // Consumption sheet
    const consumptionData = [
      ['Design Code', 'Date', 'Quantity (Kgs)', 'Source File'],
      ...consumption.map(c => [
        c.designCode,
        c.date.toISOString().split('T')[0],
        c.quantity,
        c.source
      ])
    ];
    const consumptionSheet = XLSX.utils.aoa_to_sheet(consumptionData);
    XLSX.utils.book_append_sheet(workbook, consumptionSheet, 'Consolidated Consumption');

    // Purchases sheet
    const purchaseData = [
      ['Artis Code', 'Date', 'Amount (Kgs)', 'Notes', 'Source File'],
      ...purchases.map(p => [
        p.artisCode,
        p.date.toISOString().split('T')[0],
        p.amount,
        p.notes || '',
        p.source
      ])
    ];
    const purchaseSheet = XLSX.utils.aoa_to_sheet(purchaseData);
    XLSX.utils.book_append_sheet(workbook, purchaseSheet, 'Consolidated Purchases');

    XLSX.writeFile(workbook, outputPath);
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(): Promise<string> {
    const consumption = await this.consolidateConsumption();
    const purchases = await this.consolidatePurchases();

    const report = {
      totalConsumptionRecords: consumption.length,
      totalPurchaseRecords: purchases.length,
      dateRange: {
        earliest: new Date(Math.min(...[...consumption, ...purchases].map(r => r.date.getTime()))),
        latest: new Date(Math.max(...[...consumption, ...purchases].map(r => r.date.getTime())))
      },
      uniqueDesignCodes: new Set(consumption.map(c => c.designCode)).size,
      totalConsumptionKgs: consumption.reduce((sum, c) => sum + c.quantity, 0),
      totalPurchaseKgs: purchases.reduce((sum, p) => sum + p.amount, 0),
      sourceFiles: {
        consumption: new Set(consumption.map(c => c.source)).size,
        purchases: new Set(purchases.map(p => p.source)).size
      }
    };

    return JSON.stringify(report, null, 2);
  }
}