const XLSX = require('xlsx');

const productTemplate = {
  headers: [
    'NAME',
    'OUR CODE',
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
      '9054-A',
      'MBEE',
      'Wooden',
      '60',
      'Liner,Artis'
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