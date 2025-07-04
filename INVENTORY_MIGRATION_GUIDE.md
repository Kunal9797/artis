# Artis Inventory Data Migration Guide

## 🎯 Overview
This guide will help you consolidate your existing Excel inventory files and migrate to a more efficient Google Sheets-based system with standardized formats.

## 📊 Current Issues with Your Data

### 1. **Inconsistent File Formats**
- Consumption files use dates in data rows instead of headers
- Different date formats (DD/MM/YY vs MM/DD/YY)
- Inconsistent sheet names and column headers

### 2. **Data Management Challenges**
- Multiple files for different months
- No centralized view of inventory
- Manual consolidation required

## 🚀 New System Benefits

### 1. **Standardized Templates**
- Consistent column structure
- Clear data validation rules
- Example data included

### 2. **Google Sheets Integration**
- Real-time collaboration
- Automatic calculations
- Access from anywhere
- Version history
- API integration with your app

### 3. **Automated Consolidation**
- One-click import of all historical data
- Automatic date parsing
- Source file tracking

## 📋 Migration Steps

### Step 1: Install Dependencies
```bash
cd /Users/kunal/.cursor-tutor/artis/backend
npm install xlsx googleapis
```

### Step 2: Run Consolidation Script
```bash
npm run consolidate-inventory
```

This will:
- Create standardized templates in `/Templates` folder
- Generate a consolidated Excel file with all your data
- Show a summary report of all imported data

### Step 3: Set Up Google Sheets (Optional but Recommended)

#### 3.1 Enable Google Sheets API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google Sheets API"
4. Go to "Credentials" → "Create Credentials" → "Service Account"
5. Download the JSON credentials file

#### 3.2 Configure Environment
Add to your `.env` file:
```env
GOOGLE_SHEETS_CREDENTIALS_PATH=/path/to/your/credentials.json
```

#### 3.3 Run Migration
```bash
npm run migrate-to-sheets
```

## 📁 New File Format Standards

### Consumption Template
| Column | Format | Example |
|--------|--------|---------|
| Design Code | Text/Number | 101 |
| Date | YYYY-MM-DD | 2025-01-15 |
| Quantity (Kgs) | Number | 100 |
| Notes | Text | Monthly consumption |

### Purchase Template
| Column | Format | Example |
|--------|--------|---------|
| Artis Code | Text/Number | 101 |
| Date | YYYY-MM-DD | 2025-01-15 |
| Amount (Kgs) | Number | 500 |
| Supplier | Text | Supplier A |
| Notes | Text | PO #123 |

## 🔄 Ongoing Usage

### Option 1: Continue with Excel
1. Use the standardized templates in `/Templates` folder
2. Upload files using the existing upload feature
3. Files will be automatically parsed correctly

### Option 2: Switch to Google Sheets
1. Use the created Google Sheet for all new entries
2. Set up Google Sheets sync in your app
3. Real-time updates across all users

### Option 3: Hybrid Approach
1. Use Google Sheets for daily entries
2. Export to Excel for monthly uploads
3. Best of both worlds

## 🛠️ Automation Features

### Google Sheets Benefits:
1. **Automatic Calculations**
   - Monthly summaries
   - Running stock levels
   - Consumption trends

2. **Data Validation**
   - Date format enforcement
   - Positive number validation
   - Dropdown lists for suppliers

3. **Conditional Formatting**
   - Low stock alerts (yellow)
   - High consumption (red)
   - Recent updates (green)

4. **API Integration**
   - Direct sync with your app
   - Automatic imports
   - Real-time updates

## 📝 Script Commands

Add these to your `package.json`:
```json
{
  "scripts": {
    "consolidate-inventory": "ts-node src/scripts/migrate-to-sheets.ts",
    "migrate-to-sheets": "ts-node src/scripts/migrate-to-sheets.ts",
    "create-templates": "ts-node -e \"new (require('./src/utils/excel-consolidator').ExcelConsolidator)().createStandardizedTemplates()\""
  }
}
```

## 🎯 Next Steps

1. **Immediate**: Run consolidation to see all your data in one file
2. **Short-term**: Start using standardized templates
3. **Long-term**: Consider Google Sheets migration for better collaboration

## 💡 Tips

1. **Backup**: Always keep backups of original files
2. **Test**: Try with a few files first before full migration
3. **Training**: Share templates with team members
4. **Documentation**: Keep this guide handy for reference

## 🤝 Support

If you need help with:
- Setting up Google Sheets API
- Customizing templates
- Adding new features

Just ask! The system is designed to be flexible and can be adapted to your specific needs.