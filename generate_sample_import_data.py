#!/usr/bin/env python3
"""
Generate sample Excel files for historical data import into Supabase
This script creates realistic sample data matching the Artis Laminates Excel templates
"""

import pandas as pd
from datetime import datetime, timedelta
import random
import os

# Realistic product codes based on Artis Laminates product lines
ARTIS_PRODUCTS = [
    'ART-001', 'ART-002', 'ART-003', 'ART-004', 'ART-005',
    'ART-101', 'ART-102', 'ART-103', 'ART-201', 'ART-202'
]

WOODRICA_PRODUCTS = [
    'WDR-001', 'WDR-002', 'WDR-003', 'WDR-004', 'WDR-005',
    'WDR-101', 'WDR-102', 'WDR-103', 'WDR-201', 'WDR-202'
]

ARTVIO_PRODUCTS = [
    'ATV-001', 'ATV-002', 'ATV-003', 'ATV-004', 'ATV-005',
    'ATV-101', 'ATV-102', 'ATV-103', 'ATV-201', 'ATV-202'
]

ALL_PRODUCTS = ARTIS_PRODUCTS + WOODRICA_PRODUCTS + ARTVIO_PRODUCTS

# Supplier names
SUPPLIERS = [
    'ABC Papers Pvt Ltd',
    'XYZ Design Papers',
    'Premium Papers Inc',
    'Global Paper Suppliers',
    'Quality Papers Ltd'
]

def create_consumption_template():
    """
    Creates a consumption template matching the existing format:
    - First row: Headers (SNO, DESIGN CODE, OPEN, etc.)
    - Second row: Empty except for dates in consumption columns
    - Data rows: Product consumption data
    """
    print("Creating consumption template...")
    
    # Create the structure with two header rows
    headers_row1 = ['SNO', 'DESIGN CODE', 'OPEN']
    headers_row2 = ['', '', '']  # Empty for first three columns
    
    # Add monthly consumption columns for 2024
    start_date = datetime(2024, 1, 1)
    for i in range(12):  # 12 months of data
        date = start_date + timedelta(days=30*i)
        headers_row1.append(f'{date.strftime("%b").upper()} CONS.')
        headers_row2.append(date.strftime('%d/%m/%y'))
    
    # Create sample data
    data_rows = []
    for idx, product in enumerate(ALL_PRODUCTS[:20]):  # First 20 products
        row = {
            'SNO': idx + 1,
            'DESIGN CODE': product,
            'OPEN': random.randint(500, 2000)  # Initial stock
        }
        
        # Add consumption data for each month
        for i in range(12):
            month_col = headers_row1[3 + i]
            # Vary consumption based on product type
            if product.startswith('ART'):
                consumption = random.randint(30, 100)  # Higher for 1mm
            else:
                consumption = random.randint(20, 80)   # Lower for 0.8mm
            row[month_col] = consumption
        
        data_rows.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(data_rows)
    
    # Write to Excel with custom formatting
    with pd.ExcelWriter('sample_consumption_import.xlsx', engine='openpyxl') as writer:
        df.to_excel(writer, index=False, startrow=1)
        
        # Get the worksheet
        worksheet = writer.sheets['Sheet1']
        
        # Add the date row (second header row)
        for col, date_val in enumerate(headers_row2, 1):
            worksheet.cell(row=2, column=col, value=date_val)
    
    print("✓ Created sample_consumption_import.xlsx")

def create_purchase_orders_template():
    """
    Creates purchase orders template with historical data
    """
    print("Creating purchase orders template...")
    
    data = []
    
    # Generate purchases throughout 2024
    for month in range(1, 13):  # Each month
        # 3-5 purchases per month
        num_purchases = random.randint(3, 5)
        
        for _ in range(num_purchases):
            # Random day within the month
            day = random.randint(1, 28)
            date = datetime(2024, month, day)
            
            # Select random products
            product = random.choice(ALL_PRODUCTS)
            
            # Purchase amount based on product type
            if product.startswith('ART'):
                amount = random.randint(200, 800)  # Larger purchases for 1mm
            else:
                amount = random.randint(150, 600)  # Smaller for 0.8mm
            
            # Generate PO number
            po_number = f"PO-2024-{month:02d}{random.randint(100, 999)}"
            supplier = random.choice(SUPPLIERS)
            
            data.append({
                'Artis Code': product,
                'Date': date.strftime('%m/%d/%y'),
                'Amount (Kgs)': amount,
                'Notes': f'{po_number} - {supplier}'
            })
    
    # Sort by date
    df = pd.DataFrame(data)
    df['Date_parsed'] = pd.to_datetime(df['Date'], format='%m/%d/%y')
    df = df.sort_values('Date_parsed').drop('Date_parsed', axis=1)
    
    df.to_excel('sample_purchase_orders_import.xlsx', index=False)
    print(f"✓ Created sample_purchase_orders_import.xlsx with {len(df)} purchase orders")

def create_corrections_template():
    """
    Creates corrections template for inventory adjustments
    """
    print("Creating corrections template...")
    
    corrections_data = []
    
    # Generate some realistic corrections
    correction_reasons = [
        'Physical count adjustment',
        'Damaged material write-off',
        'Quality inspection rejection',
        'Found additional stock in warehouse',
        'Transfer between locations',
        'System reconciliation',
        'Year-end inventory adjustment'
    ]
    
    # Generate corrections for various dates
    for month in range(1, 13):
        # 0-2 corrections per month
        num_corrections = random.randint(0, 2)
        
        for _ in range(num_corrections):
            product = random.choice(ALL_PRODUCTS)
            day = random.randint(1, 28)
            date = datetime(2024, month, day)
            
            # Correction can be positive or negative
            if random.random() > 0.6:  # 40% chance of positive correction
                amount = random.randint(10, 100)
            else:  # 60% chance of negative correction
                amount = -random.randint(10, 150)
            
            reason = random.choice(correction_reasons)
            
            corrections_data.append({
                'Artis Code': product,
                'Date (MM/DD/YY)': date.strftime('%m/%d/%y'),
                'Correction Amount': amount,
                'Reason': reason
            })
    
    # Add header row with instructions
    instructions_row = {
        'Artis Code': 'Instructions: Enter product code',
        'Date (MM/DD/YY)': 'Use MM/DD/YY format',
        'Correction Amount': 'Positive to add, negative to reduce',
        'Reason': 'Brief description'
    }
    
    df = pd.DataFrame([instructions_row] + corrections_data)
    df.to_excel('sample_corrections_import.xlsx', index=False)
    print(f"✓ Created sample_corrections_import.xlsx with {len(corrections_data)} corrections")

def create_initial_stock_template():
    """
    Creates a simple template for setting initial stock levels
    """
    print("Creating initial stock template...")
    
    data = []
    for product in ALL_PRODUCTS:
        # Set initial stock as of Jan 1, 2024
        initial_stock = random.randint(300, 1500)
        
        data.append({
            'Artis Code': product,
            'Date': '01/01/24',
            'Amount (Kgs)': initial_stock,
            'Notes': 'Initial stock - Opening balance 2024'
        })
    
    df = pd.DataFrame(data)
    df.to_excel('sample_initial_stock_import.xlsx', index=False)
    print(f"✓ Created sample_initial_stock_import.xlsx with {len(df)} products")

def create_summary_report():
    """
    Creates a summary of all generated data
    """
    print("\nCreating summary report...")
    
    summary = f"""
# Sample Data Import Summary
Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Files Created:
1. **sample_consumption_import.xlsx**
   - Monthly consumption data for {len(ALL_PRODUCTS[:20])} products
   - Period: January 2024 - December 2024
   - Format: Matches existing consumption template

2. **sample_purchase_orders_import.xlsx**
   - Purchase orders throughout 2024
   - Random purchases for all product lines
   - Includes PO numbers and supplier information

3. **sample_corrections_import.xlsx**
   - Inventory corrections and adjustments
   - Both positive and negative adjustments
   - Includes reasons for each correction

4. **sample_initial_stock_import.xlsx**
   - Opening balances as of January 1, 2024
   - Can be used to set initial stock levels

## Product Codes Used:
- Artis (1mm): {', '.join(ARTIS_PRODUCTS[:5])} ...
- Woodrica (0.8mm): {', '.join(WOODRICA_PRODUCTS[:5])} ...
- Artvio (0.8mm): {', '.join(ARTVIO_PRODUCTS[:5])} ...

## Import Order:
1. First import initial stock (sample_initial_stock_import.xlsx) as purchase orders
2. Then import consumption data (sample_consumption_import.xlsx)
3. Import additional purchases (sample_purchase_orders_import.xlsx)
4. Finally, apply any corrections (sample_corrections_import.xlsx)

## Notes:
- All dates are in 2024 for consistency
- Consumption varies by product thickness (higher for 1mm Artis products)
- Purchase amounts are realistic based on typical order sizes
- Corrections include both positive and negative adjustments
"""
    
    with open('sample_data_summary.md', 'w') as f:
        f.write(summary)
    
    print("✓ Created sample_data_summary.md")

def main():
    """
    Main function to generate all sample files
    """
    print("Generating sample import files for Artis Laminates...")
    print("=" * 50)
    
    # Create output directory
    os.makedirs('sample_import_data', exist_ok=True)
    os.chdir('sample_import_data')
    
    # Generate all templates
    create_initial_stock_template()
    create_consumption_template()
    create_purchase_orders_template()
    create_corrections_template()
    create_summary_report()
    
    print("\n" + "=" * 50)
    print("✓ All sample files created successfully!")
    print(f"✓ Files saved in: {os.getcwd()}")
    print("\nNext steps:")
    print("1. Review the files in the 'sample_import_data' directory")
    print("2. Modify the data as needed for your specific products")
    print("3. Use the upload endpoints to import the data")
    print("4. Run the SQL verification queries to confirm import success")

if __name__ == "__main__":
    main()