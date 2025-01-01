import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const purchaseTemplate = {
  headers: [
    ['Artis Code', 'Date', 'Amount (Kgs)', 'Notes'],
  ],
  sampleData: [
    ['901', '03/15/24', '500', 'Initial stock purchase'],
    ['902', '03/15/24', '300', 'Replenishment order'],
    ['903', '03/15/24', '250', '']
  ]
};

// Create directories if they don't exist
const publicDir = path.join(__dirname, '..', 'public');
const templatesDir = path.join(publicDir, 'templates');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir);
}

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet([
  ...purchaseTemplate.headers,
  ...purchaseTemplate.sampleData
]);

// Set column widths
worksheet['!cols'] = [
  { width: 15 },  // Artis Code
  { width: 15 },  // Date
  { width: 15 },  // Amount (Kgs)
  { width: 30 }   // Notes
];

XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Order');

const outputPath = path.join(templatesDir, 'purchase-template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Purchase order template created at: ${outputPath}`); 