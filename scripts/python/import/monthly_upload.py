#!/usr/bin/env python3
"""
Monthly Upload Script for Artis Laminates
Direct upload to Supabase without going through the web app

Usage: python monthly_upload.py <excel-file>
Example: python monthly_upload.py consumption_jan2025.xlsx
"""

import pandas as pd
import psycopg2
from datetime import datetime
import sys
import os
from psycopg2.extras import execute_batch

# Database connection (update these)
DB_URL = "postgresql://postgres.igkjogpnyppwpfvwdvby:zufdeq-fafnu9-cerXav@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

def upload_monthly_data(file_path):
    """Upload monthly consumption/purchase data from Excel"""
    
    print("🚀 Artis Monthly Upload Script")
    print("=" * 40)
    
    # Connect to database
    print("\n📡 Connecting to Supabase...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    try:
        # Read Excel file
        print(f"\n📖 Reading Excel file: {file_path}")
        df = pd.read_excel(file_path, header=[0, 1])
        print(f"Found {len(df)} rows")
        
        # Get products for lookup
        print("\n🔍 Loading products...")
        cur.execute('SELECT id, "artisCodes" FROM "Products"')
        products = cur.fetchall()
        
        # Create lookup dictionary
        product_map = {}
        for product_id, artis_codes in products:
            for code in artis_codes:
                product_map[str(code)] = product_id
        
        print(f"Loaded {len(products)} products")
        
        # Process data
        transactions = []
        skipped = 0
        
        print("\n🔄 Processing data...")
        
        # Get date columns (those with dates in second header row)
        date_columns = []
        for col in df.columns:
            if isinstance(col[1], str) and '/' in col[1]:
                date_columns.append(col)
        
        print(f"Found {len(date_columns)} date columns")
        
        # Process each row
        for idx, row in df.iterrows():
            # Get artis code (usually in 'DESIGN CODE' or 'OUR CODE' column)
            artis_code = None
            for col in df.columns:
                if 'CODE' in str(col[0]).upper():
                    artis_code = str(row[col])
                    break
            
            if not artis_code or artis_code == 'nan':
                skipped += 1
                continue
            
            product_id = product_map.get(artis_code)
            if not product_id:
                print(f"⚠️  Product not found: {artis_code}")
                skipped += 1
                continue
            
            # Process consumption for each date
            for col in date_columns:
                quantity = row[col]
                if pd.notna(quantity) and float(quantity) > 0:
                    # Parse date from column header
                    date_str = col[1]  # Second row of header
                    date_parts = date_str.split('/')
                    date = datetime(2000 + int(date_parts[2]), int(date_parts[1]), int(date_parts[0]))
                    
                    # Determine transaction type
                    trans_type = 'IN' if col[0] in ['OPEN', 'IN'] else 'OUT'
                    
                    transactions.append((
                        product_id,
                        trans_type,
                        float(quantity),
                        date,
                        f'Monthly upload - {date.strftime("%b %Y")}',
                        True  # includeInAvg
                    ))
        
        print(f"\n📊 Summary:")
        print(f"- Products processed: {len(df) - skipped}")
        print(f"- Products skipped: {skipped}")
        print(f"- Transactions to create: {len(transactions)}")
        
        # Insert transactions
        if transactions:
            print("\n💾 Inserting transactions...")
            execute_batch(cur, """
                INSERT INTO "Transactions" ("productId", type, quantity, date, notes, "includeInAvg")
                VALUES (%s, %s::"enum_Transactions_type", %s, %s, %s, %s)
            """, transactions, page_size=100)
            
            conn.commit()
            print("✅ Upload completed successfully!")
            
            # Show sample results
            print("\n📈 Sample stock levels after upload:")
            cur.execute("""
                SELECT 
                    p."artisCodes"[1] as artis_code,
                    p.supplier,
                    COALESCE(SUM(
                        CASE 
                            WHEN t.type = 'IN' THEN t.quantity
                            WHEN t.type = 'OUT' THEN -t.quantity
                        END
                    ), 0) as current_stock
                FROM "Products" p
                LEFT JOIN "Transactions" t ON p.id = t."productId"
                GROUP BY p.id, p."artisCodes", p.supplier
                HAVING COUNT(t.id) > 0
                ORDER BY current_stock DESC
                LIMIT 10
            """)
            
            results = cur.fetchall()
            print("\nTop 10 products by stock:")
            print(f"{'Artis Code':<12} {'Supplier':<20} {'Stock':<10}")
            print("-" * 45)
            for code, supplier, stock in results:
                print(f"{code:<12} {supplier:<20} {stock:>10.2f}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python monthly_upload.py <excel-file>")
        print("Example: python monthly_upload.py consumption_jan2025.xlsx")
        sys.exit(1)
    
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found")
        sys.exit(1)
    
    upload_monthly_data(file_path)