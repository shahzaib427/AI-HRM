import sqlite3

db = 'instance/career_coach.db'
conn = sqlite3.connect(db)
cur = conn.cursor()

# Show all tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('Tables in career_coach.db:', [r[0] for r in cur.fetchall()])

# Show existing columns in wellness_checkins
cur.execute("PRAGMA table_info(wellness_checkins)")
existing = {r[1] for r in cur.fetchall()}
print('Existing columns:', existing)

# Add missing columns
cols = [
    ('burnout_risk',    'VARCHAR(50)'),
    ('burnout_points',  'INTEGER DEFAULT 0'),
    ('sentiment_label', 'VARCHAR(20)'),
    ('sentiment_score', 'FLOAT DEFAULT 0.5'),
    ('emotion_label',   'VARCHAR(30)'),
    ('emotion_score',   'FLOAT DEFAULT 0.5'),
    ('recommendations', 'TEXT'),
    ('checkin_number',  'INTEGER DEFAULT 1'),
    ('updated_at',      'DATETIME'),
]

for name, defn in cols:
    if name not in existing:
        cur.execute(f'ALTER TABLE wellness_checkins ADD COLUMN {name} {defn}')
        print(f'ADDED:  {name}')
    else:
        print(f'SKIP:   {name}')

conn.commit()
conn.close()
print('\nDONE — restart Flask now')