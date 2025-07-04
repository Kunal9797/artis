# Excel File Structure Analysis Report

## Overview
This report analyzes the structure and format of Excel files in the Artis Laminates inventory data folders. Three main categories of files were examined: Consumption, Purchase, and Initial Inventory.

## File Structure Analysis

### 1. Consumption Files

**Pattern Examples:**
- `cons_liner_0.8APR2025.xlsx`
- `cons_liner_0.8May2025n.xlsx`
- `consumption update JAN2025.xlsx`

**Structure:**
- Sheet Name: "Inventory"
- First row contains dates in the consumption columns (e.g., "30/04/25")
- Data starts from row 2

**Columns:**
- `SNO` - Serial number (numeric)
- `DESIGN CODE` - Design paper code (numeric or string)
- Monthly consumption columns (e.g., `APR CONS.`, `JAN CONS.`, `FEB CONS.`, `MAR CONS.`)

**Key Findings:**
- Inconsistent file naming (sometimes "cons_liner", sometimes "consumption update")
- Month columns vary by file (single month vs. multiple months)
- First row used for date headers instead of column names
- Design codes are mostly numeric (901, 902, etc.)

### 2. Purchase Files

**Pattern Examples:**
- `APR25_liner_0.8_purchases.xlsx`
- `Q1_25_0.8MM.xlsx`
- `purchase_2024end.xlsx`

**Structure:**
- Sheet Name: "Purchase Order"
- Clean header structure in first row
- Data starts from row 2

**Columns (consistent across files):**
- `Artis Code` - Product code (can be numeric or alphanumeric like "9002-60")
- `Date` - Purchase date
- `Amount (Kgs)` - Quantity in kilograms
- `Notes` - Additional notes (mostly empty)

**Key Findings:**
- More consistent structure than consumption files
- Date format: MM/DD/YY (e.g., "04/09/25")
- Some codes include suffixes (e.g., "9002-60")
- Notes column rarely used

### 3. Initial Inventory File

**Pattern Example:**
- `initial_INV.xlsx`

**Structure:**
- Sheet Name: "Inventory"
- First row contains dates for each month column
- Multiple month columns for historical data

**Columns:**
- `SNO` - Serial number
- `DESIGN CODE` - Design paper code
- Multiple month consumption columns (`DEC CONS.`, `NOV CONS.`, `OCT CONS.`, `SEP CONS.`)
- `OPEN` - Opening inventory (contains mixed date and numeric values)

## Data Format Issues Identified

### 1. Date Format Inconsistencies
- **Issue**: Dates appear in data rows instead of headers
- **Current**: DD/MM/YY format in consumption files, MM/DD/YY in purchase files
- **Example**: "30/04/25" vs "04/30/25"

### 2. Header Row Problems
- **Issue**: Consumption files use first data row for dates
- **Impact**: Complicates data parsing and requires special handling

### 3. Naming Conventions
- **File names**: Inconsistent patterns
  - `cons_liner_0.8APR2025.xlsx`
  - `consumption update JAN2025.xlsx`
  - `APR25_liner_0.8_purchases.xlsx`
- **Column names**: Inconsistent abbreviations (CONS. vs full names)

### 4. Data Type Inconsistencies
- Design codes: Sometimes numeric (901), sometimes string ("9002-60")
- Missing standardization for product codes

### 5. Empty/Null Values
- Significant null values in multi-month consumption files
- Notes column in purchase files almost entirely empty

## Recommendations for Standardization

### 1. File Structure Standards
```
Recommended structure for all files:
- Row 1: Column headers only
- Row 2+: Data rows
- No dates in data cells that should be headers
```

### 2. Naming Conventions
```
Files:
- Consumption: consumption_[product]_[thickness]_[YYYY]_[MM].xlsx
- Purchase: purchase_[product]_[thickness]_[YYYY]_[MM].xlsx
- Initial: initial_inventory_[YYYY]_[MM].xlsx

Example:
- consumption_liner_0.8_2025_04.xlsx
- purchase_liner_0.8_2025_04.xlsx
```

### 3. Column Standards
```
Consumption Files:
- sno (INTEGER)
- design_code (VARCHAR)
- quantity (DECIMAL)
- month (DATE) - as separate column, not in header

Purchase Files:
- artis_code (VARCHAR)
- purchase_date (DATE)
- amount_kg (DECIMAL)
- notes (TEXT)
```

### 4. Date Format Standard
- Use ISO format: YYYY-MM-DD
- Store dates in dedicated date columns, not as headers
- Ensure consistent parsing across all files

### 5. Data Validation Rules
- Design codes: Enforce consistent format (e.g., always 3-4 digits, allow suffixes)
- Quantities: Must be positive numbers
- Dates: Must be valid dates in standard format
- Required fields: design_code, quantity/amount, date

### 6. Template Implementation
Create standardized Excel templates with:
- Data validation rules
- Consistent formatting
- Clear column headers
- Example rows
- Instructions sheet

### 7. Migration Strategy
1. Create mapping rules for existing data
2. Build converter scripts to standardize historical data
3. Implement validation on import
4. Provide user training on new formats

## Implementation Priority
1. **High**: Standardize date formats and header structures
2. **High**: Implement consistent file naming
3. **Medium**: Create data validation templates
4. **Medium**: Migrate historical data
5. **Low**: Clean up unused columns (e.g., Notes)

This standardization will significantly improve data quality and reduce errors in the inventory management system.