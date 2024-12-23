import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const inventoryTemplate = {
  headers: [
    'ARTIS CODE',
    'DESIGN NAME',
    'SUPPLIER',
    'OPENING STOCK',
    'TRANSACTION TYPE',
    'QUANTITY',
    'DATE',
    'NOTES'
  ],
  sampleData: [
    ['901', 'Sample Design', 'MATCH GRAPHICS', '100', 'IN', '50', '2024-03-20', 'Initial stock'],
    ['901', 'Sample Design', 'MATCH GRAPHICS', '150', 'OUT', '30', '2024-03-21', 'Sales deduction']
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
  inventoryTemplate.headers,
  ...inventoryTemplate.sampleData
]);

worksheet['!cols'] = inventoryTemplate.headers.map(() => ({ width: 15 }));

XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

const outputPath = path.join(templatesDir, 'inventory-template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Template created at:', outputPath);

export {}; 