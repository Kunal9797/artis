#!/usr/bin/env python3
"""
Smart Template Generator for Artis Laminates
Generates pre-filled Excel templates with product codes and validation
"""

import pandas as pd
import json
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import xlsxwriter
from typing import List, Dict, Optional

# Database connection (update with your Supabase credentials)
def get_db_connection():
    # Read from supabase_credentials.txt or environment variables
    return psycopg2.connect(
        host="your-supabase-host",
        database="postgres",
        user="postgres",
        password="your-password",
        port=5432
    )

def get_all_products() -> List[Dict]:
    """Fetch all active products from database"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    query = """
    SELECT 
        id,
        "artisCodes",
        supplier,
        "supplierCode",
        category,
        "currentStock"
    FROM "Products"
    ORDER BY "artisCodes"[1]
    """
    
    cur.execute(query)
    products = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return products

def check_existing_data(month_year: str, transaction_type: str) -> Dict:
    """Check what data already exists for a given month"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    query = """
    SELECT 
        COUNT(DISTINCT "productId") as product_count,
        COUNT(*) as transaction_count,
        SUM(quantity) as total_quantity
    FROM "Transactions"
    WHERE 
        TO_CHAR("date", 'YYYY-MM') = %s
        AND type = %s
    """
    
    cur.execute(query, (month_year, transaction_type))
    result = cur.fetchone()
    
    cur.close()
    conn.close()
    
    return result

def generate_consumption_template(months: List[str], output_dir: str = "smart_templates"):
    """Generate consumption template with pre-filled product codes"""
    
    products = get_all_products()
    
    # Create directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Create workbook
    filename = f"{output_dir}/consumption_template_{datetime.now().strftime('%Y%m%d')}.xlsx"
    workbook = xlsxwriter.Workbook(filename)
    
    # Add formats
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#4472C4',
        'font_color': 'white',
        'border': 1,
        'align': 'center'
    })
    
    date_format = workbook.add_format({
        'num_format': 'mm/dd/yy',
        'bg_color': '#D9E2F3',
        'border': 1,
        'align': 'center'
    })
    
    warning_format = workbook.add_format({
        'bg_color': '#FFE699',
        'border': 1
    })
    
    # Create worksheet
    worksheet = workbook.add_worksheet('Consumption Data')
    
    # Write headers
    headers = ['SNO', 'DESIGN CODE', 'SUPPLIER', 'CATEGORY']
    for month in months:
        headers.append(f"{month} CONS.")
    
    # Row 1: Headers
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)
    
    # Row 2: Dates (for consumption columns)
    worksheet.write(1, 0, '', header_format)
    worksheet.write(1, 1, '', header_format)
    worksheet.write(1, 2, '', header_format)
    worksheet.write(1, 3, '', header_format)
    
    for i, month in enumerate(months):
        # Convert month string (e.g., "JAN 2024") to date
        month_date = datetime.strptime(f"01 {month}", "%d %b %Y")
        worksheet.write(1, 4 + i, month_date.strftime("%m/%d/%y"), date_format)
    
    # Check existing data for each month
    existing_data = {}
    for month in months:
        month_date = datetime.strptime(f"01 {month}", "%d %b %Y")
        month_str = month_date.strftime("%Y-%m")
        existing_data[month] = check_existing_data(month_str, 'OUT')
    
    # Add warning row if data exists
    warning_row = 2
    for i, month in enumerate(months):
        if existing_data[month]['transaction_count'] > 0:
            worksheet.write(warning_row, 4 + i, 
                          f"WARNING: {existing_data[month]['transaction_count']} records exist", 
                          warning_format)
    
    # Write product data
    start_row = 3
    for idx, product in enumerate(products):
        row = start_row + idx
        
        # Get primary artis code
        artis_code = product['artisCodes'][0] if product['artisCodes'] else ''
        
        worksheet.write(row, 0, idx + 1)  # SNO
        worksheet.write(row, 1, artis_code)  # DESIGN CODE
        worksheet.write(row, 2, product['supplier'] or '')  # SUPPLIER
        worksheet.write(row, 3, product['category'] or '')  # CATEGORY
        
        # Leave consumption columns empty for user to fill
        for col in range(4, 4 + len(months)):
            worksheet.write(row, col, '')
    
    # Set column widths
    worksheet.set_column(0, 0, 8)   # SNO
    worksheet.set_column(1, 1, 15)  # DESIGN CODE
    worksheet.set_column(2, 2, 20)  # SUPPLIER
    worksheet.set_column(3, 3, 15)  # CATEGORY
    worksheet.set_column(4, 4 + len(months) - 1, 12)  # Consumption columns
    
    # Add data validation for consumption values (must be positive numbers)
    for col in range(4, 4 + len(months)):
        worksheet.data_validation(
            start_row, col, 
            start_row + len(products) - 1, col,
            {
                'validate': 'decimal',
                'criteria': '>=',
                'value': 0,
                'error_message': 'Please enter a positive number'
            }
        )
    
    # Add summary sheet
    summary_sheet = workbook.add_worksheet('Upload Summary')
    summary_sheet.write(0, 0, 'Upload Information', header_format)
    summary_sheet.write(1, 0, 'Generated On:')
    summary_sheet.write(1, 1, datetime.now().strftime('%Y-%m-%d %H:%M'))
    summary_sheet.write(2, 0, 'Total Products:')
    summary_sheet.write(2, 1, len(products))
    summary_sheet.write(3, 0, 'Months Included:')
    summary_sheet.write(3, 1, ', '.join(months))
    
    summary_sheet.write(5, 0, 'Existing Data Check:', header_format)
    row = 6
    for month in months:
        data = existing_data[month]
        summary_sheet.write(row, 0, month)
        if data['transaction_count'] > 0:
            summary_sheet.write(row, 1, 
                f"{data['transaction_count']} transactions, "
                f"{data['product_count']} products, "
                f"{data['total_quantity']:.2f} kg total",
                warning_format)
        else:
            summary_sheet.write(row, 1, 'No data uploaded yet')
        row += 1
    
    summary_sheet.set_column(0, 0, 20)
    summary_sheet.set_column(1, 1, 50)
    
    workbook.close()
    
    print(f"✓ Generated consumption template: {filename}")
    return filename

def generate_purchase_template(month_year: str, output_dir: str = "smart_templates"):
    """Generate purchase order template with product dropdown"""
    
    products = get_all_products()
    
    # Create directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Create workbook
    filename = f"{output_dir}/purchase_template_{month_year.replace(' ', '_')}.xlsx"
    workbook = xlsxwriter.Workbook(filename)
    
    # Add formats
    header_format = workbook.add_format({
        'bold': True,
        'bg_color': '#70AD47',
        'font_color': 'white',
        'border': 1,
        'align': 'center'
    })
    
    # Create main worksheet
    worksheet = workbook.add_worksheet('Purchase Orders')
    
    # Write headers
    headers = ['Artis Code', 'Product Info', 'Date', 'Amount (Kgs)', 'Notes']
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_format)
    
    # Create product list for dropdown
    product_list = [f"{p['artisCodes'][0]} - {p['supplier']} - {p['supplierCode']}" 
                   if p['artisCodes'] else '' for p in products]
    
    # Add sample rows with dropdown
    for row in range(1, 101):  # 100 empty rows
        # Product dropdown
        worksheet.data_validation(row, 0, row, 0, {
            'validate': 'list',
            'source': [p['artisCodes'][0] for p in products if p['artisCodes']],
            'error_message': 'Please select a valid product code'
        })
        
        # Date validation
        worksheet.data_validation(row, 2, row, 2, {
            'validate': 'date',
            'criteria': 'between',
            'minimum': date(2020, 1, 1),
            'maximum': date(2030, 12, 31),
            'error_message': 'Please enter a valid date'
        })
        
        # Amount validation
        worksheet.data_validation(row, 3, row, 3, {
            'validate': 'decimal',
            'criteria': '>',
            'value': 0,
            'error_message': 'Amount must be greater than 0'
        })
    
    # Set column widths
    worksheet.set_column(0, 0, 15)  # Artis Code
    worksheet.set_column(1, 1, 40)  # Product Info
    worksheet.set_column(2, 2, 12)  # Date
    worksheet.set_column(3, 3, 15)  # Amount
    worksheet.set_column(4, 4, 30)  # Notes
    
    # Add product reference sheet
    ref_sheet = workbook.add_worksheet('Product Reference')
    ref_sheet.write(0, 0, 'Artis Code', header_format)
    ref_sheet.write(0, 1, 'Supplier', header_format)
    ref_sheet.write(0, 2, 'Supplier Code', header_format)
    ref_sheet.write(0, 3, 'Category', header_format)
    ref_sheet.write(0, 4, 'Current Stock', header_format)
    
    for idx, product in enumerate(products):
        artis_code = product['artisCodes'][0] if product['artisCodes'] else ''
        ref_sheet.write(idx + 1, 0, artis_code)
        ref_sheet.write(idx + 1, 1, product['supplier'] or '')
        ref_sheet.write(idx + 1, 2, product['supplierCode'] or '')
        ref_sheet.write(idx + 1, 3, product['category'] or '')
        ref_sheet.write(idx + 1, 4, float(product['currentStock']) if product['currentStock'] else 0)
    
    ref_sheet.set_column(0, 0, 15)
    ref_sheet.set_column(1, 3, 20)
    ref_sheet.set_column(4, 4, 15)
    
    workbook.close()
    
    print(f"✓ Generated purchase template: {filename}")
    return filename

def main():
    """Generate smart templates for the current and next 3 months"""
    
    # Get current month and next 3 months
    today = datetime.now()
    months = []
    for i in range(4):
        month_date = today + relativedelta(months=i)
        months.append(month_date.strftime("%b %Y").upper())
    
    print("Generating Smart Templates for Artis Laminates")
    print("=" * 50)
    
    # Generate consumption template
    print(f"\nGenerating consumption template for: {', '.join(months)}")
    consumption_file = generate_consumption_template(months)
    
    # Generate purchase template for current month
    print(f"\nGenerating purchase template for: {months[0]}")
    purchase_file = generate_purchase_template(months[0])
    
    print("\n✅ Templates generated successfully!")
    print("\nFeatures included:")
    print("- Pre-filled product codes and information")
    print("- Data validation for all input fields")
    print("- Warning when data already exists for a month")
    print("- Product reference sheet in purchase template")
    print("- Summary sheet with upload information")
    
    print("\n📁 Files saved in: smart_templates/")

if __name__ == "__main__":
    # Note: Update database credentials before running
    print("NOTE: Update database credentials in get_db_connection() before running!")
    # main()  # Uncomment after updating credentials