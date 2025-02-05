import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const consumptionTemplate = {
  headers: [
    ['SNO', 'DESIGN CODE', 'JAN CONS.', 'FEB CONS.', 'MAR CONS.', 'APR CONS.'],
    ['', '', '31/01/24', '29/02/24', '31/03/24', '30/04/24']
  ],
  sampleData: [
    ['1', '901', '34', '21', '21', '37'],
    ['2', '902', '57', '0', '28', '25'],
    ['3', '903', '33', '0', '16', '45']
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
  ...consumptionTemplate.headers,
  ...consumptionTemplate.sampleData
]);

// Set column widths
worksheet['!cols'] = [
  { width: 8 },   // SNO
  { width: 15 },  // DESIGN CODE
  { width: 12 },  // JAN CONS
  { width: 12 },  // FEB CONS
  { width: 12 },  // MAR CONS
  { width: 12 }   // APR CONS
];

XLSX.utils.book_append_sheet(workbook, worksheet, 'Consumption');

const outputPath = path.join(templatesDir, 'consumption-template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('Consumption template created at:', outputPath);

export {}; 