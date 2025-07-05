#!/usr/bin/env python3
import re

def process_products_copy_data():
    """Process the raw COPY data for Products table"""
    
    with open('/Users/kunal/.cursor-tutor/artis/products_raw_data.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    columns = "id, name, \"supplierCode\", supplier, category, gsm, texture, thickness, catalogs, \"currentStock\", \"avgConsumption\", \"lastUpdated\", \"minStockLevel\", \"createdAt\", \"updatedAt\", \"artisCodes\""
    
    inserts = []
    
    for line in lines:
        line = line.rstrip('\n')
        if not line:
            continue
            
        # Split by tabs
        fields = line.split('\t')
        
        if len(fields) != 16:
            print(f"Warning: Line has {len(fields)} fields instead of 16")
            continue
        
        # Process each field
        values = []
        for i, field in enumerate(fields):
            if field == '\\N':
                values.append('NULL')
            elif i in [0, 1, 2, 3, 4, 6, 7]:  # String fields (id, name, supplierCode, supplier, category, texture, thickness)
                escaped = field.replace("'", "''")
                values.append(f"'{escaped}'")
            elif i == 5:  # gsm (can be numeric or NULL)
                if field == '\\N':
                    values.append('NULL')
                else:
                    values.append(field)
            elif i in [8, 15]:  # Array fields (catalogs, artisCodes)
                # Convert {item1,item2} to ARRAY['item1','item2']
                if field == '{}':
                    values.append("ARRAY[]::character varying[]")
                else:
                    content = field[1:-1]  # Remove {}
                    items = content.split(',')
                    quoted_items = [f"'{item.strip()}'" for item in items]
                    values.append(f"ARRAY[{','.join(quoted_items)}]::character varying[]")
            elif i in [9, 10]:  # Numeric fields (currentStock, avgConsumption)
                values.append(field)
            elif i in [11, 13, 14]:  # Timestamp fields
                values.append(f"'{field}'")
            elif i == 12:  # minStockLevel (can be NULL)
                if field == '\\N':
                    values.append('NULL')
                else:
                    values.append(field)
        
        insert = f"INSERT INTO public.\"Products\" ({columns}) VALUES ({', '.join(values)});"
        inserts.append(insert)
    
    # Write to file
    with open('/Users/kunal/.cursor-tutor/artis/products_inserts.sql', 'w') as f:
        f.write('-- Products import\n')
        f.write('BEGIN;\n\n')
        
        # Write in batches of 50
        for i in range(0, len(inserts), 50):
            batch = inserts[i:i+50]
            for insert in batch:
                f.write(insert + '\n')
            f.write('\n')
        
        f.write('COMMIT;\n')
    
    print(f"Generated {len(inserts)} INSERT statements")
    print("Output saved to: /Users/kunal/.cursor-tutor/artis/products_inserts.sql")

if __name__ == "__main__":
    process_products_copy_data()