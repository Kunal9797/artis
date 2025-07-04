import pandas as pd
import os
from pathlib import Path
import json

def analyze_excel_file(file_path):
    """Analyze an Excel file and return its structure"""
    try:
        # Read all sheets
        excel_file = pd.ExcelFile(file_path)
        sheets = excel_file.sheet_names
        
        analysis = {
            "file_path": file_path,
            "file_name": os.path.basename(file_path),
            "sheets": {}
        }
        
        for sheet in sheets:
            df = pd.read_excel(file_path, sheet_name=sheet)
            
            # Analyze the sheet
            sheet_analysis = {
                "shape": df.shape,
                "columns": list(df.columns),
                "column_types": {col: str(df[col].dtype) for col in df.columns},
                "null_counts": df.isnull().sum().to_dict(),
                "sample_data": df.head(3).to_dict() if len(df) > 0 else {},
                "date_columns": []
            }
            
            # Identify potential date columns
            for col in df.columns:
                if 'date' in col.lower() or 'time' in col.lower():
                    sheet_analysis["date_columns"].append(col)
                elif df[col].dtype == 'datetime64[ns]':
                    sheet_analysis["date_columns"].append(col)
                elif df[col].dtype == 'object' and len(df) > 0:
                    # Check if string values look like dates
                    sample = df[col].dropna().head(5)
                    if any(sample.astype(str).str.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$')):
                        sheet_analysis["date_columns"].append(col)
            
            analysis["sheets"][sheet] = sheet_analysis
        
        return analysis
        
    except Exception as e:
        return {"error": str(e), "file_path": file_path}

def main():
    # Files to analyze
    files_to_analyze = [
        "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Consumption/cons_liner_0.8APR2025.xlsx",
        "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Purchase/APR25_liner_0.8_purchases.xlsx",
        "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Initial Inv/initial_INV.xlsx"
    ]
    
    print("=== EXCEL FILE STRUCTURE ANALYSIS ===\n")
    
    for file_path in files_to_analyze:
        if os.path.exists(file_path):
            print(f"\nAnalyzing: {file_path}")
            print("-" * 80)
            
            analysis = analyze_excel_file(file_path)
            
            if "error" in analysis:
                print(f"Error: {analysis['error']}")
                continue
            
            print(f"File: {analysis['file_name']}")
            print(f"Number of sheets: {len(analysis['sheets'])}")
            
            for sheet_name, sheet_data in analysis['sheets'].items():
                print(f"\n  Sheet: '{sheet_name}'")
                print(f"  Dimensions: {sheet_data['shape'][0]} rows x {sheet_data['shape'][1]} columns")
                print(f"  Columns: {', '.join(sheet_data['columns'])}")
                
                if sheet_data['date_columns']:
                    print(f"  Potential date columns: {', '.join(sheet_data['date_columns'])}")
                
                # Show sample data for first few columns
                print(f"\n  Sample data (first 3 rows):")
                for col in list(sheet_data['columns'])[:5]:  # Show first 5 columns
                    if col in sheet_data['sample_data']:
                        print(f"    {col}:")
                        for i in range(min(3, len(sheet_data['sample_data'][col]))):
                            value = sheet_data['sample_data'][col].get(i, '')
                            print(f"      Row {i}: {value}")
                
                # Show null counts if any
                null_cols = [col for col, count in sheet_data['null_counts'].items() if count > 0]
                if null_cols:
                    print(f"\n  Columns with null values:")
                    for col in null_cols:
                        print(f"    {col}: {sheet_data['null_counts'][col]} nulls")
        else:
            print(f"\nFile not found: {file_path}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    main()