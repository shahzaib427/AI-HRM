import sqlite3

db = 'instance/career_coach.db'
conn = sqlite3.connect(db)
cur = conn.cursor()

cur.execute("PRAGMA table_info(chat_messages)")
existing = {r[1] for r in cur.fetchall()}
print('Existing columns:', existing)

cols = [
    ('session_id', 'VARCHAR(64)'),
    ('chat_type',  'VARCHAR(20) DEFAULT "hr"'),
    ('created_at', 'DATETIME'),
]

for name, defn in cols:
    if name not in existing:
        cur.execute(f'ALTER TABLE chat_messages ADD COLUMN {name} {defn}')
        print(f'ADDED:  {name}')
    else:
        print(f'SKIP:   {name}')

conn.commit()
conn.close()
print('\nDONE — restart Flask now')