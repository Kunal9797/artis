const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Define headers
const headers = ['Artis Code', 'Date (MM/DD/YY)', 'Correction Amount', 'Reason'];

// Create example data
const data = [
  headers,
  ['901', '03/31/24', 5.2, 'March closing adjustment'],
  ['902', '03/31/24', -2.5, 'Reconciliation with physical count'],
  ['903', '03/31/24', 1.75, 'Found additional stock'],
  ['', '', '', ''],
  ['Instructions:', '', '', ''],
  ['1. Artis Code: Enter your product code', '', '', ''],
  ['2. Date: Use MM/DD/YY format', '', '', ''],
  ['3. Correction Amount: Positive to add, negative to subtract', '', '', ''],
  ['4. Reason: Always provide a reason for audit purposes', '', '', ''],
];

// Create a worksheet
const ws = XLSX.utils.aoa_to_sheet(data);

// Set column widths
ws['!cols'] = [
  { wch: 15 }, // Artis Code
  { wch: 15 }, // Date
  { wch: 15 }, // Correction Amount
  { wch: 40 }, // Reason
];

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(workbook, ws, 'Corrections');

// Create public/templates directory if it doesn't exist
const targetDir = path.join(__dirname, '../frontend/public/templates');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Write the workbook to a file
const filePath = path.join(targetDir, 'correction-template.xlsx');
XLSX.writeFile(workbook, filePath);

console.log(`Correction template created at: ${filePath}`); 