"""Test format_schedule_for_embedding with actual data"""
import pyodbc
import sys
sys.path.insert(0, '.')

from rag_config import get_connection_string
from rag.document_loader import format_schedule_for_embedding

conn = pyodbc.connect(get_connection_string())
cursor = conn.cursor()

query = """
SELECT id, date, day_of_week, start_time, end_time,
       content, location, leader, participants,
       preparing_unit, cooperating_units, notes
FROM schedules
WHERE CAST(date AS DATE) = '2026-01-26'
"""
cursor.execute(query)

columns = [col[0] for col in cursor.description]
rows = cursor.fetchall()

for row in rows:
    schedule_dict = dict(zip(columns, row))
    print("Raw schedule_dict:")
    for k, v in schedule_dict.items():
        print(f"  {k}: {v!r} (type: {type(v).__name__})")
    
    print("\nFormatted for embedding:")
    formatted = format_schedule_for_embedding(schedule_dict)
    print(formatted)

conn.close()
