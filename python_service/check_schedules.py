"""Check schedules in database"""
import pyodbc
from rag_config import get_connection_string

conn = pyodbc.connect(get_connection_string())
cursor = conn.cursor()

# Check total schedules
cursor.execute('SELECT COUNT(*) FROM schedules')
total = cursor.fetchone()[0]
print(f'Total schedules: {total}')

# Check by status
cursor.execute("SELECT status, COUNT(*) as cnt FROM schedules GROUP BY status")
print('By status:')
for row in cursor.fetchall():
    print(f'  {row[0]}: {row[1]}')

# Show some schedules
cursor.execute("SELECT TOP 5 id, date, content, status FROM schedules ORDER BY date DESC")
print('\nRecent schedules:')
for row in cursor.fetchall():
    print(f'  {row[1]} | {row[3]} | {row[2][:50]}...')

conn.close()
