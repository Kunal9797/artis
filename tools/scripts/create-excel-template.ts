const XLSX = require('xlsx');

const productTemplate = {
  headers: [
    'NAME',
    'OUR CODE',
    'ALT CODE',
    'DESIGN CODE',
    'SUPPLIER',
    'CATEGORY',
    'GSM',
    'CATALOGS'
  ],
  sampleData: [
    [
      'SNOW COROBA',
      '501',
      '501W',
      '9054-A',
      'MBEE',
      'Wooden',
      '60',
      'Woodrica'
    ],
    [
      'SNOW COROBA',
      '501A',
      '501W',
      '9054-A',
      'MBEE',
      'Wooden',
      '60',
      'Artvio'
    ]
  ]
};

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet([
  productTemplate.headers,
  ...productTemplate.sampleData
]);

worksheet['!cols'] = [
  { width: 20 }, // NAME
  { width: 15 }, // OUR CODE
  { width: 15 }, // ALT CODE
  { width: 15 }, // DESIGN CODE
  { width: 15 }, // SUPPLIER
  { width: 15 }, // CATEGORY
  { width: 10 }, // GSM
  { width: 20 }  // CATALOGS
];

XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
XLSX.writeFile(workbook, 'public/templates/product-template.xlsx');

// Add empty export to make this a module
export {}; 