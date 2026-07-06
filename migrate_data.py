import json
import sys

def generate_inserts(table_name, data):
    if not data or not isinstance(data, list) or len(data) == 0:
        return ""
    
    # Filter out None items in data
    data = [item for item in data if item is not None]
    if not data:
        return ""

    columns = data[0].keys()
    columns_str = ", ".join([f'"{c}"' for c in columns])
    
    inserts = []
    for row in data:
        values = []
        for c in columns:
            v = row[c]
            if v is None:
                values.append("NULL")
            elif isinstance(v, (bool, int, float)):
                values.append(str(v).lower())
            elif isinstance(v, (dict, list)):
                values.append(f"'{json.dumps(v)}'::jsonb")
            else:
                # Escape single quotes
                v_escaped = str(v).replace("'", "''")
                values.append(f"'{v_escaped}'")
        
        values_str = ", ".join(values)
        inserts.append(f"INSERT INTO public.{table_name} ({columns_str}) VALUES ({values_str}) ON CONFLICT DO NOTHING;")
    
    return "\n".join(inserts)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_data.py <json_file> [table_name]")
        sys.exit(1)
    
    json_file = sys.argv[1]
    target_table = sys.argv[2] if len(sys.argv) > 2 else None
    
    with open(json_file, 'r', encoding='utf-8') as f:
        full_data = json.load(f)
    
    # Handle MCP result format (list of dicts)
    if isinstance(full_data, list) and len(full_data) > 0:
        full_data = full_data[0]
        
    # Check for 'batch_data' or 'json_agg'
    if 'batch_data' in full_data:
        full_data = full_data['batch_data']
    elif 'json_agg' in full_data:
        # If it's just one table's json_agg
        if target_table:
            full_data = {target_table: full_data['json_agg']}
        else:
            full_data = {"data": full_data['json_agg']}

    if target_table:
        tables = {target_table: full_data.get(target_table, [])}
    else:
        tables = full_data

    for table_name, data in tables.items():
        if not data or not isinstance(data, list):
            continue

        print(f"DELETE FROM public.{table_name};")
        print(generate_inserts(table_name, data))
