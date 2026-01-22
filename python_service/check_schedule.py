"""Check schedules for specific date"""
import pyodbc
from rag_config import get_connection_string

conn = pyodbc.connect(get_connection_string())
cursor = conn.cursor()

# Count all schedules
query_all = """
SELECT COUNT(*) FROM schedules WHERE status IN ('approved', 'draft')
"""
cursor.execute(query_all)
total = cursor.fetchone()[0]
print(f"Total schedules (approved/draft): {total}")

# Check schedules for Jan 26, 2026
query = """
SELECT id, date, content, status, leader, location
FROM schedules 
WHERE CAST(date AS DATE) = '2026-01-26'
"""
cursor.execute(query)
rows = cursor.fetchall()

print(f"\nFound {len(rows)} schedules for 2026-01-26:")
for row in rows:
    print(f"  ID: {row[0]}")
    print(f"  Date: {row[1]}")
    print(f"  Content: {row[2][:100]}..." if len(str(row[2])) > 100 else f"  Content: {row[2]}")
    print(f"  Status: {row[3]}")
    print(f"  Leader: {row[4]}")
    print(f"  Location: {row[5]}")
    print("-" * 50)

conn.close()
