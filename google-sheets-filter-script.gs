/**
 * Google Apps Script for Artis Design List
 * Adds quick filter buttons for supplier and catalog filtering
 * 
 * To use:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire script
 * 4. Save (Ctrl+S or Cmd+S)
 * 5. Refresh your Google Sheet
 * 6. You'll see a new "Quick Filters" menu
 */

// Run when the spreadsheet opens
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Quick Filters')
    .addSubMenu(ui.createMenu('Filter by Supplier')
      .addItem('MATCH GRAPHICS', 'filterByMatchGraphics')
      .addItem('UNIQUE DÉCOR', 'filterByUniqueDecor')
      .addItem('INFINIAA DÉCOR', 'filterByInfiniaDecor')
      .addItem('SURFACE DÉCOR', 'filterBySurfaceDecor')
      .addItem('EURO PRATIK', 'filterByEuroPratik')
      .addItem('CENTURY', 'filterByCentury')
      .addItem('GREENLAM', 'filterByGreenlam')
      .addItem('STONE AGE', 'filterByStoneAge')
      .addSeparator()
      .addItem('Show All Suppliers', 'clearFilters'))
    .addSubMenu(ui.createMenu('Filter by Catalog')
      .addItem('Woodrica', 'filterByWoodrica')
      .addItem('Artvio', 'filterByArtvio')
      .addItem('Artis', 'filterByArtis')
      .addItem('Both (Woodrica & Artvio)', 'filterByBoth')
      .addSeparator()
      .addItem('Show All Catalogs', 'clearFilters'))
    .addSeparator()
    .addItem('Clear All Filters', 'clearFilters')
    .addItem('Show Filter Summary', 'showFilterSummary')
    .addToUi();
}

// Helper function to get the data range (assuming headers in row 1)
function getDataRange() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  return sheet.getRange(1, 1, lastRow, lastCol);
}

// Helper function to find column index by header name
function getColumnIndex(headerName) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].toString().toLowerCase().includes(headerName.toLowerCase())) {
      return i + 1; // 1-based index
    }
  }
  return -1;
}

// Clear all filters
function clearFilters() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var filter = sheet.getFilter();
  if (filter) {
    filter.remove();
  }
  SpreadsheetApp.getUi().alert('All filters cleared!');
}

// Filter by supplier functions
function filterBySupplier(supplierName) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = getDataRange();
  var supplierCol = getColumnIndex('supplier');
  
  if (supplierCol === -1) {
    SpreadsheetApp.getUi().alert('Supplier column not found!');
    return;
  }
  
  // Remove existing filter
  var existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
  
  // Create new filter
  var filter = range.createFilter();
  var criteria = SpreadsheetApp.newFilterCriteria()
    .whenTextContains(supplierName)
    .build();
  filter.setColumnFilterCriteria(supplierCol, criteria);
  
  SpreadsheetApp.getUi().alert('Filtered by supplier: ' + supplierName);
}

// Supplier filter functions
function filterByMatchGraphics() { filterBySupplier('MATCH GRAPHICS'); }
function filterByUniqueDecor() { filterBySupplier('UNIQUE'); }
function filterByInfiniaDecor() { filterBySupplier('INFINIAA'); }
function filterBySurfaceDecor() { filterBySupplier('SURFACE'); }
function filterByEuroPratik() { filterBySupplier('EURO PRATIK'); }
function filterByCentury() { filterBySupplier('CENTURY'); }
function filterByGreenlam() { filterBySupplier('GREENLAM'); }
function filterByStoneAge() { filterBySupplier('STONE AGE'); }

// Filter by catalog functions
function filterByCatalog(catalogName) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = getDataRange();
  var catalogCol = getColumnIndex('catalog');
  
  if (catalogCol === -1) {
    // Try alternative column names
    catalogCol = getColumnIndex('collection');
    if (catalogCol === -1) {
      catalogCol = getColumnIndex('brand');
      if (catalogCol === -1) {
        SpreadsheetApp.getUi().alert('Catalog/Collection column not found!');
        return;
      }
    }
  }
  
  // Remove existing filter
  var existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
  
  // Create new filter
  var filter = range.createFilter();
  var criteria = SpreadsheetApp.newFilterCriteria()
    .whenTextContains(catalogName)
    .build();
  filter.setColumnFilterCriteria(catalogCol, criteria);
  
  SpreadsheetApp.getUi().alert('Filtered by catalog: ' + catalogName);
}

function filterByWoodrica() { filterByCatalog('Woodrica'); }
function filterByArtvio() { filterByCatalog('Artvio'); }
function filterByArtis() { filterByCatalog('Artis'); }

// Filter by both Woodrica and Artvio
function filterByBoth() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var range = getDataRange();
  var catalogCol = getColumnIndex('catalog');
  
  if (catalogCol === -1) {
    catalogCol = getColumnIndex('collection');
    if (catalogCol === -1) {
      SpreadsheetApp.getUi().alert('Catalog/Collection column not found!');
      return;
    }
  }
  
  // Remove existing filter
  var existingFilter = sheet.getFilter();
  if (existingFilter) {
    existingFilter.remove();
  }
  
  // Create new filter for "Both"
  var filter = range.createFilter();
  var criteria = SpreadsheetApp.newFilterCriteria()
    .whenTextContains('Both')
    .build();
  filter.setColumnFilterCriteria(catalogCol, criteria);
  
  SpreadsheetApp.getUi().alert('Filtered by catalog: Both (Woodrica & Artvio)');
}

// Show filter summary
function showFilterSummary() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  var supplierCol = getColumnIndex('supplier') - 1;
  var catalogCol = getColumnIndex('catalog') - 1;
  if (catalogCol === -1) {
    catalogCol = getColumnIndex('collection') - 1;
  }
  
  var suppliers = {};
  var catalogs = {};
  var visibleCount = 0;
  
  for (var i = 0; i < data.length; i++) {
    // Check if row is hidden
    if (!sheet.isRowHiddenByFilter(i + 2)) {
      visibleCount++;
      
      if (supplierCol >= 0) {
        var supplier = data[i][supplierCol];
        suppliers[supplier] = (suppliers[supplier] || 0) + 1;
      }
      
      if (catalogCol >= 0) {
        var catalog = data[i][catalogCol];
        catalogs[catalog] = (catalogs[catalog] || 0) + 1;
      }
    }
  }
  
  var summary = 'Filter Summary:\n\n';
  summary += 'Visible Products: ' + visibleCount + ' of ' + (lastRow - 1) + '\n\n';
  
  summary += 'By Supplier:\n';
  for (var sup in suppliers) {
    summary += '• ' + sup + ': ' + suppliers[sup] + '\n';
  }
  
  summary += '\nBy Catalog:\n';
  for (var cat in catalogs) {
    summary += '• ' + cat + ': ' + catalogs[cat] + '\n';
  }
  
  SpreadsheetApp.getUi().alert(summary);
}

// Optional: Add custom buttons to the sheet itself
function addFilterButtons() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var ui = SpreadsheetApp.getUi();
  
  // This would add buttons, but Google Sheets doesn't support 
  // adding clickable buttons via Apps Script directly.
  // The menu option above is the best approach.
  
  ui.alert('Use the "Quick Filters" menu in the menu bar for filtering options.');
}