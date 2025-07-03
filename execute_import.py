#!/usr/bin/env python3
import os

def split_inserts_by_table(file_path):
    """Split INSERT statements by table."""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    table_inserts = {
        'Users': [],
        'Products': [],
        'SalesTeams': [],
        'Transactions': [],
        'Attendance': [],
        'Attendances': [],
        'DealerVisits': [],
        'Leads': [],
        'Messages': [],
        'distributors': [],
        'SequelizeMeta': []
    }
    
    for line in lines:
        if line.startswith('INSERT INTO'):
            for table in table_inserts:
                if f'public."{table}"' in line or f'public.{table}' in line:
                    table_inserts[table].append(line.strip())
                    break
    
    return table_inserts

def write_table_files(table_inserts):
    """Write separate SQL files for each table."""
    for table, inserts in table_inserts.items():
        if inserts:
            filename = f'/Users/kunal/.cursor-tutor/artis/import_{table}.sql'
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f'-- Import data for {table} table\n\n')
                for insert in inserts:
                    f.write(insert + '\n')
            print(f"Created {filename} with {len(inserts)} records")

def main():
    file_path = '/Users/kunal/.cursor-tutor/artis/database_inserts.sql'
    
    print("Splitting INSERT statements by table...")
    table_inserts = split_inserts_by_table(file_path)
    
    print("\nWriting separate files for each table...")
    write_table_files(table_inserts)
    
    print("\nImport order:")
    print("1. Users")
    print("2. Products")
    print("3. SalesTeams")
    print("4. SequelizeMeta")
    print("5. Transactions")
    print("6. Attendances")
    print("7. Leads")
    print("8. distributors")

if __name__ == "__main__":
    main()