import pandas as pd
import os
from pathlib import Path
import re
from datetime import datetime

def analyze_date_formats(values):
    """Analyze date format patterns in a series of values"""
    patterns = {
        'MM/DD/YY': r'^\d{1,2}/\d{1,2}/\d{2}$',
        'DD/MM/YY': r'^\d{1,2}/\d{1,2}/\d{2}$',
        'MM/DD/YYYY': r'^\d{1,2}/\d{1,2}/\d{4}$',
        'DD/MM/YYYY': r'^\d{1,2}/\d{1,2}/\d{4}$',
        'YYYY-MM-DD': r'^\d{4}-\d{1,2}-\d{1,2}$',
        'DD-MM-YYYY': r'^\d{1,2}-\d{1,2}-\d{4}$',
    }
    
    format_counts = {}
    for value in values:
        if pd.isna(value):
            continue
        str_val = str(value).strip()
        for format_name, pattern in patterns.items():
            if re.match(pattern, str_val):
                format_counts[format_name] = format_counts.get(format_name, 0) + 1
                break
    
    return format_counts

def detailed_analysis():
    """Perform detailed analysis of Excel files"""
    
    # Files to analyze
    files = {
        "consumption": "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Consumption/cons_liner_0.8APR2025.xlsx",
        "purchase": "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Purchase/APR25_liner_0.8_purchases.xlsx",
        "initial": "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Initial Inv/initial_INV.xlsx"
    }
    
    print("=== DETAILED EXCEL FILE ANALYSIS ===\n")
    
    for file_type, file_path in files.items():
        print(f"\n{'='*60}")
        print(f"FILE TYPE: {file_type.upper()}")
        print(f"Path: {file_path}")
        print('='*60)
        
        try:
            # Read Excel file
            excel_file = pd.ExcelFile(file_path)
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                print(f"\nSheet: '{sheet_name}'")
                print(f"Shape: {df.shape}")
                
                # Analyze header row (first row with actual data)
                print("\nHEADER ANALYSIS:")
                # Check if first row might be a date
                first_row = df.iloc[0] if len(df) > 0 else None
                if first_row is not None:
                    for col_idx, (col_name, value) in enumerate(first_row.items()):
                        if pd.notna(value) and isinstance(value, str) and '/' in value:
                            print(f"  Column '{col_name}' has date-like value in first row: {value}")
                
                # Analyze each column
                print("\nCOLUMN ANALYSIS:")
                for col in df.columns:
                    print(f"\n  Column: '{col}'")
                    print(f"  Data type: {df[col].dtype}")
                    
                    # Get non-null values
                    non_null = df[col].dropna()
                    if len(non_null) > 0:
                        print(f"  Non-null count: {len(non_null)}")
                        print(f"  Unique values: {non_null.nunique()}")
                        
                        # Show sample values
                        sample_size = min(5, len(non_null))
                        print(f"  Sample values: {list(non_null.head(sample_size))}")
                        
                        # Check for date patterns
                        if df[col].dtype == 'object':
                            date_formats = analyze_date_formats(non_null)
                            if date_formats:
                                print(f"  Date format patterns found: {date_formats}")
                        
                        # Check if numeric
                        if df[col].dtype in ['int64', 'float64']:
                            print(f"  Range: {non_null.min()} to {non_null.max()}")
                
                # Look for patterns in column names
                print("\nCOLUMN NAME PATTERNS:")
                date_cols = [col for col in df.columns if any(word in col.upper() for word in ['DATE', 'MONTH', 'CONS', 'TIME'])]
                code_cols = [col for col in df.columns if any(word in col.upper() for word in ['CODE', 'ARTIS', 'DESIGN'])]
                amount_cols = [col for col in df.columns if any(word in col.upper() for word in ['AMOUNT', 'KGS', 'QUANTITY', 'QTY'])]
                
                if date_cols:
                    print(f"  Date-related columns: {date_cols}")
                if code_cols:
                    print(f"  Code-related columns: {code_cols}")
                if amount_cols:
                    print(f"  Amount-related columns: {amount_cols}")
                
        except Exception as e:
            print(f"Error analyzing file: {e}")
    
    print("\n\n=== SUMMARY OF FINDINGS ===")
    print("\n1. CONSUMPTION FILE (cons_liner_0.8APR2025.xlsx):")
    print("   - First row contains date (30/04/25) in 'APR CONS.' column")
    print("   - Actual data starts from row 2")
    print("   - Columns: SNO, DESIGN CODE, APR CONS.")
    print("   - Design codes are numeric (901, 902, etc.)")
    print("   - Consumption values are numeric")
    
    print("\n2. PURCHASE FILE (APR25_liner_0.8_purchases.xlsx):")
    print("   - Clean structure with headers in first row")
    print("   - Columns: Artis Code, Date, Amount (Kgs), Notes")
    print("   - Dates in MM/DD/YY format (04/09/25)")
    print("   - Artis codes are 4-digit numbers (9001, etc.)")
    print("   - Amount in kilograms")
    
    print("\n3. INITIAL INVENTORY FILE (initial_INV.xlsx):")
    print("   - First row contains dates for each month column")
    print("   - Columns: SNO, DESIGN CODE, DEC CONS., NOV CONS., OCT CONS., SEP CONS., OPEN")
    print("   - Multiple month columns with consumption data")
    print("   - 'OPEN' column likely represents opening inventory")

if __name__ == "__main__":
    detailed_analysis()