#!/usr/bin/env python3

def split_sql_file(input_file, lines_per_file=500):
    """Split SQL file into smaller chunks"""
    with open(input_file, 'r') as f:
        lines = f.readlines()
    
    chunks = []
    current_chunk = []
    current_table = None
    
    for line in lines:
        if line.startswith('-- ') and 'records)' in line:
            # New table section
            if current_chunk and len(current_chunk) > 1:
                chunks.append((current_table, current_chunk))
            current_table = line.strip().split()[1]
            current_chunk = [line]
        elif line.strip() and not line.startswith('--'):
            current_chunk.append(line)
            
            # Split large tables into smaller chunks
            if len(current_chunk) >= lines_per_file:
                chunks.append((current_table, current_chunk))
                current_chunk = []
    
    # Add the last chunk
    if current_chunk:
        chunks.append((current_table, current_chunk))
    
    # Write chunk files
    for i, (table, chunk_lines) in enumerate(chunks):
        filename = f'/Users/kunal/.cursor-tutor/artis/import_chunk_{i:03d}_{table}.sql'
        with open(filename, 'w') as f:
            f.write(f'-- Chunk {i} for {table}\n')
            f.writelines(chunk_lines)
        print(f"Created {filename} with {len(chunk_lines)} lines")
    
    return chunks

if __name__ == "__main__":
    chunks = split_sql_file('/Users/kunal/.cursor-tutor/artis/all_inserts.sql')
    print(f"\nTotal chunks created: {len(chunks)}")