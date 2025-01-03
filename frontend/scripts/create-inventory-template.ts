import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const inventoryTemplate = {
  headers: [
    ['SNO', 'DESIGN CODE', 'DEC CONS.', 'NOV CONS.', 'OCT CONS.', 'SEP CONS.', 'OPEN'],
    ['', '', '31/12/24', '30/11/24', '31/10/24', '30/09/24', '01/09/24']
  ],
  sampleData: [
    ['1', '901', '34', '21', '21', '37', '231'],
    ['2', '902', '57', '0', '28', '25', '222'],
    ['3', '903', '33', '0', '16', '45', '207']
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
  { width: 12 },  // DEC CONS
  { width: 12 },  // NOV CONS
  { width: 12 },  // OCT CONS
  { width: 12 },  // SEP CONS
  { width: 15 }   // 09/01/24 OPEN
];

XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

const outputPath = path.join(templatesDir, 'inventory-template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Template created at:', outputPath);

export {}; 