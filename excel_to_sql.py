#!/usr/bin/env python3
"""
Convert Excel consumption data to SQL INSERT statements
This creates a SQL file you can run directly in Supabase

Usage: python excel_to_sql.py <excel-file>
Output: Creates <excel-file>.sql
"""

import pandas as pd
import sys
import os
from datetime import datetime

def excel_to_sql(file_path):
    """Convert Excel to SQL INSERT statements"""
    
    print(f"📖 Reading Excel file: {file_path}")
    df = pd.read_excel(file_path, header=[0, 1])
    
    # Output SQL file
    sql_file = file_path.replace('.xlsx', '.sql').replace('.xls', '.sql')
    
    with open(sql_file, 'w') as f:
        f.write("-- Artis Monthly Upload SQL\n")
        f.write(f"-- Generated from: {file_path}\n")
        f.write(f"-- Date: {datetime.now()}\n\n")
        
        f.write("BEGIN;\n\n")
        
        # Find date columns
        date_columns = []
        for col in df.columns:
            if isinstance(col[1], str) and '/' in col[1]:
                date_columns.append(col)
        
        transaction_count = 0
        
        # Process each row
        for idx, row in df.iterrows():
            # Get artis code
            artis_code = None
            for col in df.columns:
                if 'CODE' in str(col[0]).upper():
                    artis_code = str(row[col])
                    break
            
            if not artis_code or artis_code == 'nan':
                continue
            
            # Process each date column
            for col in date_columns:
                quantity = row[col]
                if pd.notna(quantity) and float(quantity) > 0:
                    # Parse date
                    date_str = col[1]
                    date_parts = date_str.split('/')
                    date = datetime(2000 + int(date_parts[2]), int(date_parts[1]), int(date_parts[0]))
                    
                    # Transaction type
                    trans_type = 'IN' if col[0] in ['OPEN', 'IN'] else 'OUT'
                    
                    # Write SQL
                    f.write(f"""
-- {artis_code}: {quantity} {trans_type} on {date.strftime('%Y-%m-%d')}
INSERT INTO "Transactions" ("productId", type, quantity, date, notes, "includeInAvg")
SELECT id, '{trans_type}'::"enum_Transactions_type", {quantity}, '{date.strftime('%Y-%m-%d')}'::date, 
       'Monthly upload - {date.strftime("%b %Y")}', true
FROM "Products" 
WHERE '{artis_code}' = ANY("artisCodes");
""")
                    transaction_count += 1
        
        f.write(f"\n-- Total transactions: {transaction_count}\n")
        f.write("COMMIT;\n")
    
    print(f"✅ Created SQL file: {sql_file}")
    print(f"📊 Total transactions: {transaction_count}")
    print(f"\n🎯 Next steps:")
    print(f"1. Open Supabase SQL Editor")
    print(f"2. Copy and paste the contents of {sql_file}")
    print(f"3. Run the query")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python excel_to_sql.py <excel-file>")
        sys.exit(1)
    
    excel_to_sql(sys.argv[1])