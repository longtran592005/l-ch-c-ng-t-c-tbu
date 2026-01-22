"""Test date parser and schedule lookup"""
import pyodbc
import sys
sys.path.insert(0, '.')

from rag_config import get_connection_string
from rag.date_parser import parse_date_expression, get_date_filter_sql, format_date_vietnamese

# Test date parsing
test_queries = [
    "ngay 26 co lich khong",
    "ngày 26 có lịch không",
    "lịch ngày 26/01/2026",
    "lịch ngày 26/1",
    "lịch hôm nay"
]

for q in test_queries:
    result = parse_date_expression(q)
    print(f"Query: '{q}'")
    print(f"  Parsed: {result}")
    if result:
        where_clause, params = get_date_filter_sql(result)
        print(f"  SQL: {where_clause}")
        print(f"  Params: {params}")
    print()

# Test with actual database
print("=" * 60)
print("Testing database query for Jan 26, 2026:")

result = parse_date_expression("ngày 26")
if result:
    where_clause, params = get_date_filter_sql(result)
    
    conn = pyodbc.connect(get_connection_string())
    cursor = conn.cursor()
    
    query = f"""
        SELECT id, date, content, location, leader
        FROM schedules
        WHERE status IN ('approved', 'draft') AND {where_clause}
        ORDER BY date, start_time
    """
    print(f"Executing: {query}")
    print(f"With params: {params}")
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    print(f"\nFound {len(rows)} schedules:")
    for row in rows:
        print(f"  {row}")
    
    conn.close()
else:
    print("Failed to parse date!")
