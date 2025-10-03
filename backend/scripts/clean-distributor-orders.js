const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Input and output paths
const INPUT_FILE = '/Users/kunal/Downloads/DECORATIVE PARTY (1).xlsx';
const OUTPUT_DIR = path.join(__dirname, '../output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'distributor_orders_cleaned.xlsx');
const REPORT_FILE = path.join(OUTPUT_DIR, 'distributor_orders_validation_report.txt');

// State mapping for Indian cities
const STATE_MAPPING = {
  // Maharashtra
  'Mumbai': 'Maharashtra',
  'Pune': 'Maharashtra',
  'Thane': 'Maharashtra',
  'Nashik': 'Maharashtra',
  'Nagpur': 'Maharashtra',
  'Solapur': 'Maharashtra',
  'Kolhapur': 'Maharashtra',
  'Aurangabad': 'Maharashtra',
  'Vasai': 'Maharashtra',
  'Latur': 'Maharashtra',
  'Sangli': 'Maharashtra',
  'Jalgaon': 'Maharashtra',
  'Akola': 'Maharashtra',
  'Ahmednagar': 'Maharashtra',
  'Dhulia': 'Maharashtra',
  'Dhuliya': 'Maharashtra',
  'Gondia': 'Maharashtra',

  // Gujarat
  'Ahmedabad': 'Gujarat',
  'Surat': 'Gujarat',
  'Vadodara': 'Gujarat',
  'Rajkot': 'Gujarat',
  'Gandhinagar': 'Gujarat',
  'Valsad': 'Gujarat',
  'Vapi': 'Gujarat',
  'Gandhidham': 'Gujarat',

  // Rajasthan
  'Jaipur': 'Rajasthan',
  'Jodhpur': 'Rajasthan',
  'Udaipur': 'Rajasthan',
  'Ajmer': 'Rajasthan',
  'Bikaner': 'Rajasthan',
  'Kota': 'Rajasthan',

  // Karnataka
  'Bangalore': 'Karnataka',
  'Bengaluru': 'Karnataka',
  'Mysore': 'Karnataka',
  'Hubli': 'Karnataka',
  'Mangalore': 'Karnataka',
  'Belgaum': 'Karnataka',
  'Gulbarga': 'Karnataka',

  // Tamil Nadu
  'Chennai': 'Tamil Nadu',
  'Coimbatore': 'Tamil Nadu',
  'Madurai': 'Tamil Nadu',
  'Trichy': 'Tamil Nadu',
  'Salem': 'Tamil Nadu',
  'Tirupur': 'Tamil Nadu',
  'Vellore': 'Tamil Nadu',

  // Uttar Pradesh
  'Lucknow': 'Uttar Pradesh',
  'Kanpur': 'Uttar Pradesh',
  'Noida': 'Uttar Pradesh',
  'Ghaziabad': 'Uttar Pradesh',
  'Agra': 'Uttar Pradesh',
  'Varanasi': 'Uttar Pradesh',
  'Allahabad': 'Uttar Pradesh',
  'Bareilly': 'Uttar Pradesh',
  'Moradabad': 'Uttar Pradesh',
  'Saharanpur': 'Uttar Pradesh',
  'Jhansi': 'Uttar Pradesh',
  'Kashipur': 'Uttar Pradesh',
  'Meerut': 'Uttar Pradesh',
  'Rampur': 'Uttar Pradesh',
  'Baliya': 'Uttar Pradesh',

  // Delhi NCR
  'Delhi': 'Delhi',
  'New Delhi': 'Delhi',
  'Gurugram': 'Haryana',
  'Gurgaon': 'Haryana',
  'Faridabad': 'Haryana',

  // West Bengal
  'Kolkata': 'West Bengal',
  'Calcutta': 'West Bengal',
  'Howrah': 'West Bengal',
  'Durgapur': 'West Bengal',
  'Siliguri': 'West Bengal',

  // Telangana
  'Hyderabad': 'Telangana',
  'Secunderabad': 'Telangana',
  'Warangal': 'Telangana',

  // Andhra Pradesh
  'Visakhapatnam': 'Andhra Pradesh',
  'Vijayawada': 'Andhra Pradesh',
  'Guntur': 'Andhra Pradesh',
  'Nellore': 'Andhra Pradesh',

  // Punjab
  'Ludhiana': 'Punjab',
  'Amritsar': 'Punjab',
  'Jalandhar': 'Punjab',
  'Patiala': 'Punjab',
  'Bathinda': 'Punjab',

  // Haryana
  'Chandigarh': 'Chandigarh',
  'Ambala': 'Haryana',
  'Panipat': 'Haryana',
  'Rohtak': 'Haryana',
  'Karnal': 'Haryana',
  'Hisar': 'Haryana',

  // Madhya Pradesh
  'Bhopal': 'Madhya Pradesh',
  'Indore': 'Madhya Pradesh',
  'Gwalior': 'Madhya Pradesh',
  'Jabalpur': 'Madhya Pradesh',
  'Satna': 'Madhya Pradesh',
  'Singrauli': 'Madhya Pradesh',

  // Bihar
  'Patna': 'Bihar',
  'Gaya': 'Bihar',
  'Bhagalpur': 'Bihar',

  // Jharkhand
  'Ranchi': 'Jharkhand',
  'Jamshedpur': 'Jharkhand',
  'Dhanbad': 'Jharkhand',

  // Odisha
  'Bhubaneswar': 'Odisha',
  'Cuttack': 'Odisha',
  'Rourkela': 'Odisha',

  // Kerala
  'Kochi': 'Kerala',
  'Cochin': 'Kerala',
  'Thiruvananthapuram': 'Kerala',
  'Kozhikode': 'Kerala',
  'Thrissur': 'Kerala',

  // Assam
  'Guwahati': 'Assam',
  'Dispur': 'Assam',

  // Uttarakhand
  'Dehradun': 'Uttarakhand',
  'Haridwar': 'Uttarakhand',
  'Haldwani': 'Uttarakhand',

  // Chhattisgarh
  'Raipur': 'Chhattisgarh',
  'Bhilai': 'Chhattisgarh',

  // Jammu & Kashmir
  'Jammu': 'Jammu & Kashmir',
  'Srinagar': 'Jammu & Kashmir',
  'Kashmir': 'Kashmir',

  // Himachal Pradesh
  'Shimla': 'Himachal Pradesh',
  'Dharamshala': 'Himachal Pradesh',

  // Goa
  'Panaji': 'Goa',
  'Margao': 'Goa',
  'Vasco': 'Goa'
};

// Helper functions
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Handle DD.MM.YYYY format
  if (typeof dateStr === 'string' && dateStr.includes('.')) {
    const [day, month, year] = dateStr.split('.');
    if (day && month && year) {
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
  }

  // Handle Excel date serial numbers
  if (typeof dateStr === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
  }

  // Try parsing as regular date
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthYear(date) {
  if (!date) return '';
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getQuarter(date) {
  if (!date) return '';
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

function getState(location) {
  if (!location) return '';

  // Clean location string
  const cleanLocation = location.trim();

  // Try exact match first
  if (STATE_MAPPING[cleanLocation]) {
    return STATE_MAPPING[cleanLocation];
  }

  // Try case-insensitive match
  const locationLower = cleanLocation.toLowerCase();
  for (const [city, state] of Object.entries(STATE_MAPPING)) {
    if (city.toLowerCase() === locationLower) {
      return state;
    }
  }

  // Try partial match
  for (const [city, state] of Object.entries(STATE_MAPPING)) {
    if (cleanLocation.includes(city) || city.includes(cleanLocation)) {
      return state;
    }
  }

  return 'Unknown';
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? 0 : Math.floor(num);
}

function cleanDistributorName(name) {
  if (!name) return '';
  return String(name).trim().replace(/\s+/g, ' ');
}

// Main processing function
async function cleanDistributorOrders() {
  const report = [];
  const errors = [];
  const warnings = [];

  try {
    console.log('📚 Reading Excel file...');
    report.push('='.repeat(60));
    report.push('DISTRIBUTOR ORDERS CLEANING REPORT');
    report.push('='.repeat(60));
    report.push(`Processed on: ${new Date().toLocaleString()}`);
    report.push(`Input file: ${INPUT_FILE}`);
    report.push('');

    // Read the Excel file
    const workbook = XLSX.readFile(INPUT_FILE);

    // Get the second sheet (Sheet1)
    const sheetName = workbook.SheetNames[1]; // Index 1 for second sheet
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Get headers (assuming first row)
    const headers = rawData[0];
    console.log('Headers found:', headers);

    // Process data rows
    const cleanedData = [];
    let validRows = 0;
    let invalidRows = 0;
    let totalPieces = 0;
    const distributorStats = {};
    const thicknessStats = {
      '72_92': 0,
      '08': 0,
      '1mm': 0
    };

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];

      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) continue;

      // Extract data based on column positions
      const location = row[0];
      const distributorName = row[1];
      const dateStr = row[2];
      const thickness_72_92 = parseNumber(row[3]);
      const thickness_08 = parseNumber(row[4]);
      const thickness_1mm = parseNumber(row[5]);
      const totalFromFile = parseNumber(row[6]);

      // Skip if essential fields are missing
      if (!distributorName || !dateStr) {
        if (distributorName || dateStr) { // Partial data
          warnings.push(`Row ${i + 1}: Incomplete data - missing ${!distributorName ? 'distributor' : 'date'}`);
        }
        continue;
      }

      // Parse and validate date
      const orderDate = parseDate(dateStr);
      if (!orderDate) {
        errors.push(`Row ${i + 1}: Invalid date format - ${dateStr}`);
        invalidRows++;
        continue;
      }

      // Calculate total
      const calculatedTotal = thickness_72_92 + thickness_08 + thickness_1mm;

      // Validation
      let validationStatus = 'OK';
      let notes = '';

      // Check if totals match
      if (totalFromFile && Math.abs(calculatedTotal - totalFromFile) > 1) {
        validationStatus = 'WARNING';
        notes = `Total mismatch: calculated=${calculatedTotal}, file=${totalFromFile}`;
        warnings.push(`Row ${i + 1}: ${notes}`);
      }

      // Check for negative values
      if (thickness_72_92 < 0 || thickness_08 < 0 || thickness_1mm < 0) {
        validationStatus = 'ERROR';
        notes = 'Negative thickness values';
        errors.push(`Row ${i + 1}: ${notes}`);
      }

      // Check for unusually large values
      if (calculatedTotal > 10000) {
        if (validationStatus === 'OK') validationStatus = 'WARNING';
        notes += (notes ? '; ' : '') + `Large order: ${calculatedTotal} pieces`;
        warnings.push(`Row ${i + 1}: Large order detected - ${calculatedTotal} pieces`);
      }

      // Clean and process
      const cleanedDistributor = cleanDistributorName(distributorName);
      const cleanedLocation = location ? location.trim() : '';
      const state = getState(cleanedLocation);
      const monthYear = getMonthYear(orderDate);
      const quarter = getQuarter(orderDate);

      // Add to cleaned data
      cleanedData.push({
        'Distributor Name': cleanedDistributor,
        'Location': cleanedLocation,
        'State': state,
        'Order Date': formatDate(orderDate),
        'Thickness .72/.82/.92': thickness_72_92,
        'Thickness 0.8mm': thickness_08,
        'Thickness 1mm': thickness_1mm,
        'Total Pieces': calculatedTotal,
        'Month/Year': monthYear,
        'Quarter': quarter,
        'Validation Status': validationStatus,
        'Notes': notes
      });

      // Update statistics
      validRows++;
      totalPieces += calculatedTotal;
      thicknessStats['72_92'] += thickness_72_92;
      thicknessStats['08'] += thickness_08;
      thicknessStats['1mm'] += thickness_1mm;

      // Track distributor stats
      if (!distributorStats[cleanedDistributor]) {
        distributorStats[cleanedDistributor] = {
          orders: 0,
          totalPieces: 0,
          locations: new Set()
        };
      }
      distributorStats[cleanedDistributor].orders++;
      distributorStats[cleanedDistributor].totalPieces += calculatedTotal;
      distributorStats[cleanedDistributor].locations.add(cleanedLocation);
    }

    // Sort cleaned data by date
    cleanedData.sort((a, b) => new Date(a['Order Date']) - new Date(b['Order Date']));

    // Create output directory if it doesn't exist
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Create new workbook with cleaned data
    console.log('📝 Writing cleaned Excel file...');
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(cleanedData);

    // Auto-size columns
    const colWidths = [
      { wch: 25 }, // Distributor Name
      { wch: 15 }, // Location
      { wch: 15 }, // State
      { wch: 12 }, // Order Date
      { wch: 15 }, // Thickness .72/.82/.92
      { wch: 15 }, // Thickness 0.8mm
      { wch: 12 }, // Thickness 1mm
      { wch: 12 }, // Total Pieces
      { wch: 15 }, // Month/Year
      { wch: 10 }, // Quarter
      { wch: 15 }, // Validation Status
      { wch: 40 }  // Notes
    ];
    newWorksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Cleaned Orders');

    // Add summary sheet
    const summaryData = [
      ['Summary Statistics', ''],
      ['', ''],
      ['Total Records Processed', rawData.length - 1],
      ['Valid Orders', validRows],
      ['Invalid/Skipped Rows', invalidRows],
      ['Total Warnings', warnings.length],
      ['Total Errors', errors.length],
      ['', ''],
      ['Total Pieces', totalPieces.toLocaleString()],
      ['Average Order Size', Math.round(totalPieces / validRows).toLocaleString()],
      ['', ''],
      ['Thickness Distribution', ''],
      ['.72/.82/.92 mm', thicknessStats['72_92'].toLocaleString()],
      ['0.8 mm', thicknessStats['08'].toLocaleString()],
      ['1 mm', thicknessStats['1mm'].toLocaleString()],
      ['', ''],
      ['Date Range', ''],
      ['First Order', cleanedData.length > 0 ? cleanedData[0]['Order Date'] : 'N/A'],
      ['Last Order', cleanedData.length > 0 ? cleanedData[cleanedData.length - 1]['Order Date'] : 'N/A'],
      ['', ''],
      ['Top 10 Distributors by Volume', '']
    ];

    // Add top distributors
    const topDistributors = Object.entries(distributorStats)
      .sort((a, b) => b[1].totalPieces - a[1].totalPieces)
      .slice(0, 10);

    topDistributors.forEach(([name, stats]) => {
      summaryData.push([
        name,
        `${stats.totalPieces.toLocaleString()} pieces (${stats.orders} orders)`
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(newWorkbook, summarySheet, 'Summary');

    // Write the file
    XLSX.writeFile(newWorkbook, OUTPUT_FILE);
    console.log(`✅ Cleaned file saved: ${OUTPUT_FILE}`);

    // Generate text report
    report.push('PROCESSING SUMMARY');
    report.push('-'.repeat(60));
    report.push(`Total records processed: ${rawData.length - 1}`);
    report.push(`Valid orders: ${validRows}`);
    report.push(`Invalid/skipped rows: ${invalidRows}`);
    report.push(`Total warnings: ${warnings.length}`);
    report.push(`Total errors: ${errors.length}`);
    report.push('');

    report.push('STATISTICS');
    report.push('-'.repeat(60));
    report.push(`Total pieces: ${totalPieces.toLocaleString()}`);
    report.push(`Average order size: ${Math.round(totalPieces / validRows).toLocaleString()} pieces`);
    report.push('');
    report.push('Thickness Distribution:');
    report.push(`  .72/.82/.92 mm: ${thicknessStats['72_92'].toLocaleString()} pieces (${(thicknessStats['72_92'] / totalPieces * 100).toFixed(1)}%)`);
    report.push(`  0.8 mm: ${thicknessStats['08'].toLocaleString()} pieces (${(thicknessStats['08'] / totalPieces * 100).toFixed(1)}%)`);
    report.push(`  1 mm: ${thicknessStats['1mm'].toLocaleString()} pieces (${(thicknessStats['1mm'] / totalPieces * 100).toFixed(1)}%)`);
    report.push('');

    report.push('TOP 10 DISTRIBUTORS BY VOLUME');
    report.push('-'.repeat(60));
    topDistributors.forEach(([name, stats], index) => {
      report.push(`${index + 1}. ${name}`);
      report.push(`   Total: ${stats.totalPieces.toLocaleString()} pieces`);
      report.push(`   Orders: ${stats.orders}`);
      report.push(`   Locations: ${Array.from(stats.locations).join(', ')}`);
      report.push('');
    });

    if (errors.length > 0) {
      report.push('ERRORS');
      report.push('-'.repeat(60));
      errors.forEach(err => report.push(err));
      report.push('');
    }

    if (warnings.length > 0) {
      report.push('WARNINGS');
      report.push('-'.repeat(60));
      warnings.slice(0, 20).forEach(warn => report.push(warn)); // Show first 20 warnings
      if (warnings.length > 20) {
        report.push(`... and ${warnings.length - 20} more warnings`);
      }
      report.push('');
    }

    report.push('OUTPUT FILES');
    report.push('-'.repeat(60));
    report.push(`Cleaned data: ${OUTPUT_FILE}`);
    report.push(`Validation report: ${REPORT_FILE}`);
    report.push('');
    report.push('='.repeat(60));
    report.push('Processing completed successfully!');
    report.push('='.repeat(60));

    // Write report to file
    fs.writeFileSync(REPORT_FILE, report.join('\n'), 'utf8');
    console.log(`📊 Report saved: ${REPORT_FILE}`);

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Valid orders: ${validRows}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`📦 Total pieces: ${totalPieces.toLocaleString()}`);
    console.log('='.repeat(60));
    console.log('\nProcessing completed! Check the output files:');
    console.log(`1. ${OUTPUT_FILE}`);
    console.log(`2. ${REPORT_FILE}`);

  } catch (error) {
    console.error('❌ Error processing file:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
cleanDistributorOrders();