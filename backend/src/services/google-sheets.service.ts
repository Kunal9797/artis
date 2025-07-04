import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  credentials: any; // Google service account credentials
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(config: GoogleSheetsConfig) {
    this.spreadsheetId = config.spreadsheetId;
    
    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: config.credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /**
   * Create a new spreadsheet with initial structure
   */
  async createInventorySpreadsheet(title: string): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `${title} - Artis Inventory`,
          },
          sheets: [
            {
              properties: {
                title: 'Live Inventory',
                gridProperties: { frozenRowCount: 1 },
              },
            },
            {
              properties: {
                title: 'Consumption',
                gridProperties: { frozenRowCount: 1 },
              },
            },
            {
              properties: {
                title: 'Purchases',
                gridProperties: { frozenRowCount: 1 },
              },
            },
            {
              properties: {
                title: 'Monthly Summary',
                gridProperties: { frozenRowCount: 1 },
              },
            },
          ],
        },
      });

      return response.data.spreadsheetId || '';
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Update inventory data in Google Sheets
   */
  async updateInventoryData(data: any[][], sheetName: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data,
        },
      });
    } catch (error) {
      console.error('Error updating sheet:', error);
      throw error;
    }
  }

  /**
   * Append new consumption entries
   */
  async appendConsumption(entries: Array<{
    designCode: string;
    date: string;
    quantity: number;
    notes?: string;
  }>): Promise<void> {
    const values = entries.map(e => [
      e.designCode,
      e.date,
      e.quantity,
      e.notes || ''
    ]);

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Consumption!A:D',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error('Error appending consumption:', error);
      throw error;
    }
  }

  /**
   * Append new purchase entries
   */
  async appendPurchases(entries: Array<{
    artisCode: string;
    date: string;
    amount: number;
    supplier?: string;
    notes?: string;
  }>): Promise<void> {
    const values = entries.map(e => [
      e.artisCode,
      e.date,
      e.amount,
      e.supplier || '',
      e.notes || ''
    ]);

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Purchases!A:E',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });
    } catch (error) {
      console.error('Error appending purchases:', error);
      throw error;
    }
  }

  /**
   * Get current inventory snapshot
   */
  async getInventorySnapshot(): Promise<any[][]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Live Inventory!A:Z',
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error getting inventory:', error);
      throw error;
    }
  }

  /**
   * Create monthly summary with formulas
   */
  async createMonthlySummary(): Promise<void> {
    const summaryFormulas = [
      ['Month', 'Total Consumption', 'Total Purchases', 'Net Change', 'Running Stock'],
      ['=UNIQUE(TEXT(Consumption!B2:B,"MMM-YYYY"))', 
       '=SUMIF(TEXT(Consumption!B:B,"MMM-YYYY"),A2,Consumption!C:C)',
       '=SUMIF(TEXT(Purchases!B:B,"MMM-YYYY"),A2,Purchases!C:C)',
       '=C2-B2',
       '=E1+D2'
      ]
    ];

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Monthly Summary!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: summaryFormulas,
        },
      });

      // Auto-fill formulas
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            autoFill: {
              range: {
                sheetId: await this.getSheetId('Monthly Summary'),
                startRowIndex: 1,
                endRowIndex: 50,
                startColumnIndex: 0,
                endColumnIndex: 5,
              },
              useAlternateSeries: false,
            },
          }],
        },
      });
    } catch (error) {
      console.error('Error creating summary:', error);
      throw error;
    }
  }

  /**
   * Set up data validation rules
   */
  async setupDataValidation(): Promise<void> {
    try {
      const requests = [
        // Date validation for Consumption sheet
        {
          setDataValidation: {
            range: {
              sheetId: await this.getSheetId('Consumption'),
              startRowIndex: 1,
              startColumnIndex: 1,
              endColumnIndex: 2,
            },
            rule: {
              condition: {
                type: 'DATE_IS_VALID' as any,
              },
              inputMessage: 'Enter date in format: YYYY-MM-DD',
              strict: true,
              showCustomUi: true,
            },
          },
        },
        // Positive number validation for quantities
        {
          setDataValidation: {
            range: {
              sheetId: await this.getSheetId('Consumption'),
              startRowIndex: 1,
              startColumnIndex: 2,
              endColumnIndex: 3,
            },
            rule: {
              condition: {
                type: 'NUMBER_GREATER' as any,
                values: [{ userEnteredValue: '0' }],
              },
              inputMessage: 'Enter positive quantity in Kgs',
              strict: true,
              showCustomUi: true,
            },
          },
        },
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests },
      });
    } catch (error) {
      console.error('Error setting up validation:', error);
      throw error;
    }
  }

  /**
   * Get sheet ID by name
   */
  private async getSheetId(sheetName: string): Promise<number> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = response.data.sheets?.find(
        s => s.properties?.title === sheetName
      );

      return sheet?.properties?.sheetId || 0;
    } catch (error) {
      console.error('Error getting sheet ID:', error);
      throw error;
    }
  }

  /**
   * Apply conditional formatting for better visualization
   */
  async applyConditionalFormatting(): Promise<void> {
    try {
      const requests = [
        // Highlight high consumption (>1000 kgs) in red
        {
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: await this.getSheetId('Consumption'),
                startRowIndex: 1,
                startColumnIndex: 2,
                endColumnIndex: 3,
              }],
              booleanRule: {
                condition: {
                  type: 'NUMBER_GREATER' as any,
                  values: [{ userEnteredValue: '1000' }],
                },
                format: {
                  backgroundColor: { red: 1, green: 0.8, blue: 0.8 },
                },
              },
            },
            index: 0,
          },
        },
        // Highlight low stock items
        {
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: await this.getSheetId('Live Inventory'),
                startRowIndex: 1,
                startColumnIndex: 2,
                endColumnIndex: 3,
              }],
              booleanRule: {
                condition: {
                  type: 'NUMBER_LESS' as any,
                  values: [{ userEnteredValue: '100' }],
                },
                format: {
                  backgroundColor: { red: 1, green: 1, blue: 0.8 },
                  textFormat: { bold: true },
                },
              },
            },
            index: 1,
          },
        },
      ];

      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests },
      });
    } catch (error) {
      console.error('Error applying formatting:', error);
      throw error;
    }
  }
}