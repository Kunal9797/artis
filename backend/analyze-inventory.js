const XLSX = require('xlsx');

const files = {
  initial: '/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Initial Inv/initial_INV.xlsx',
  consumption: '/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Consumption/consumption update JAN2025.xlsx',
  purchase: '/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Purchase/purchase_2024end.xlsx'
};

function analyzeFile(filePath, name) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name}`);
  console.log('='.repeat(60));
  
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`Sheet name: ${sheetName}`);
    console.log(`Total rows: ${data.length}`);
    
    // Show first few rows
    console.log('\nFirst 5 rows:');
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`Row ${i}: ${JSON.stringify(data[i])}`);
    }
    
    // Analyze structure
    if (name.includes('Initial')) {
      console.log('\nAnalysis:');
      console.log('- Row 0: Headers');
      console.log('- Row 1: Contains dates for each consumption month and opening balance (45300)');
      console.log('- Row 2+: Design code data');
      
      // Check the opening balance position
      const openingBalanceCol = data[1].indexOf(45300);
      console.log(`- Opening balance (45300) found at column ${openingBalanceCol} (${data[0][openingBalanceCol]})`);
    }
    
    if (name.includes('Consumption')) {
      console.log('\nAnalysis:');
      console.log('- Row 0: Headers');
      console.log('- Row 1: Contains dates for each month');
      console.log('- Row 2+: Design code consumption data');
    }
    
    if (name.includes('Purchase')) {
      console.log('\nAnalysis:');
      console.log('- Simple structure: Design Code, Date, Amount, Notes');
      console.log('- Date format appears to be MM/DD/YY');
      
      // Check date formats
      console.log('\nSample dates:');
      for (let i = 1; i < Math.min(6, data.length); i++) {
        if (data[i] && data[i][1]) {
          console.log(`  ${data[i][1]}`);
        }
      }
    }
    
    // Get unique design codes
    if (!name.includes('Purchase')) {
      const designCodes = new Set();
      for (let i = 2; i < data.length; i++) {
        if (data[i] && data[i][1]) {
          designCodes.add(data[i][1]);
        }
      }
      console.log(`\nUnique design codes: ${designCodes.size}`);
      console.log(`Sample codes: ${Array.from(designCodes).slice(0, 10).join(', ')}`);
    } else {
      const designCodes = new Set();
      const dates = new Set();
      for (let i = 1; i < data.length; i++) {
        if (data[i] && data[i][0]) {
          designCodes.add(data[i][0]);
        }
        if (data[i] && data[i][1]) {
          dates.add(data[i][1]);
        }
      }
      console.log(`\nUnique design codes in purchases: ${designCodes.size}`);
      console.log(`Sample codes: ${Array.from(designCodes).slice(0, 10).join(', ')}`);
      console.log(`\nUnique purchase dates: ${dates.size}`);
      console.log(`Date range: ${Array.from(dates).sort()[0]} to ${Array.from(dates).sort()[dates.size - 1]}`);
    }
    
  } catch (error) {
    console.log(`Error reading file: ${error.message}`);
  }
}

// Analyze each file
analyzeFile(files.initial, 'INITIAL INVENTORY FILE');
analyzeFile(files.consumption, 'CONSUMPTION FILE (JAN 2025)');
analyzeFile(files.purchase, 'PURCHASE FILE (2024 END)');

console.log(`\n${'='.repeat(60)}`);
console.log('SUMMARY');
console.log('='.repeat(60));
console.log('\nFile Structure Summary:');
console.log('1. Initial Inventory:');
console.log('   - Has opening balance (45300) in row 1, column 6');
console.log('   - Contains consumption data for Sep, Oct, Nov, Dec 2024');
console.log('   - Design codes start from row 2');
console.log('\n2. Consumption File:');
console.log('   - Contains consumption for Jan, Feb, Mar 2025');
console.log('   - Dates in row 1 (30/01/25, 28/02/25, 30/03/25)');
console.log('   - Design codes start from row 2');
console.log('\n3. Purchase File:');
console.log('   - Simple structure with Design Code, Date, Amount (Kgs), Notes');
console.log('   - Dates appear to be in MM/DD/YY format');
console.log('\nRecommended Upload Sequence:');
console.log('1. First: Upload initial_INV.xlsx to set opening balances');
console.log('2. Then: Upload purchase_2024end.xlsx to record purchases');
console.log('3. Finally: Upload consumption update JAN2025.xlsx for latest consumption');