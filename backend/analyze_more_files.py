import pandas as pd
import os

def analyze_additional_files():
    """Analyze additional Excel files for patterns"""
    
    files_to_check = [
        "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Consumption/consumption update JAN2025.xlsx",
        "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Purchase/Q1_25_0.8MM.xlsx",
        "/Users/kunal/Desktop/Artis/ArtisInvApp/Inventory Data/Purchase/purchase_2024end.xlsx"
    ]
    
    print("=== ADDITIONAL FILE ANALYSIS ===\n")
    
    for file_path in files_to_check:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
            
        print(f"\nFile: {os.path.basename(file_path)}")
        print("-" * 60)
        
        try:
            excel_file = pd.ExcelFile(file_path)
            print(f"Sheets: {excel_file.sheet_names}")
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                print(f"\n  Sheet '{sheet_name}':")
                print(f"  Shape: {df.shape}")
                print(f"  Columns: {list(df.columns)}")
                
                # Check first few rows
                if len(df) > 0:
                    print(f"\n  First 3 rows preview:")
                    for idx in range(min(3, len(df))):
                        row_data = []
                        for col in df.columns[:5]:  # First 5 columns
                            val = df.iloc[idx][col]
                            if pd.isna(val):
                                row_data.append("NaN")
                            else:
                                row_data.append(str(val)[:20])  # Truncate long values
                        print(f"    Row {idx}: {' | '.join(row_data)}")
                
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    analyze_additional_files()