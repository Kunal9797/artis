import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const inventoryTemplate = {
  headers: [
    ['SNO', 'OUR CODE', 'OUT', 'OUT', 'OUT', 'IN'],
    ['', '', '30/10/2024', '30/9/2024', '30/8/2024', '1/8/24']
  ],
  sampleData: [
    ['1', '901', '21', '37', '64', '295'],
    ['2', '902', '28', '25', '46', '268'],
    ['3', '903', '16', '45', '41', '248']
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
  ...inventoryTemplate.headers,
  ...inventoryTemplate.sampleData
]);

// Set column widths
worksheet['!cols'] = [
  { width: 8 },   // SNO
  { width: 15 },  // DESIGN CODE
  { width: 12 },  // OUT (October)
  { width: 12 },  // OUT (September)
  { width: 12 },  // OUT (August)
  { width: 12 }   // IN (Initial Stock)
];

XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

const outputPath = path.join(templatesDir, 'inventory-template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Template created at:', outputPath);

export {}; 