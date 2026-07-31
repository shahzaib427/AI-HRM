"""
Run this script ONCE from your project root to add the missing columns
to the wellness_checkins table.

Usage:
    python migrate_wellness.py

It is safe to run multiple times — it skips columns that already exist.
"""

import sqlite3
import os
import sys

# ------------------------------------------------------------------ #
# Point this at your actual SQLite file.                              #
# Common locations — the script tries them in order.                  #
# ------------------------------------------------------------------ #
CANDIDATE_PATHS = [
    "instance/hrm.db",
    "instance/app.db",
    "instance/database.db",
    "instance/wellness.db",
    "hrm.db",
    "app.db",
    "database.db",
]

def find_db():
    for p in CANDIDATE_PATHS:
        if os.path.exists(p):
            return p
    return None


# Columns to add: (column_name, column_definition)
MISSING_COLUMNS = [
    ("burnout_risk",      "VARCHAR(50)"),
    ("burnout_points",    "INTEGER DEFAULT 0"),
    ("sentiment_label",   "VARCHAR(20) DEFAULT 'NEUTRAL'"),
    ("sentiment_score",   "FLOAT DEFAULT 0.5"),
    ("emotion_label",     "VARCHAR(30) DEFAULT 'neutral'"),
    ("emotion_score",     "FLOAT DEFAULT 0.5"),
    ("recommendations",   "TEXT"),
    ("checkin_number",    "INTEGER DEFAULT 1"),
    ("updated_at",        "DATETIME"),
]


def get_existing_columns(cursor, table_name):
    cursor.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cursor.fetchall()}  # row[1] = column name


def migrate(db_path):
    print(f"\nConnecting to: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check the table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='wellness_checkins'")
    if not cursor.fetchone():
        print("ERROR: Table 'wellness_checkins' does not exist yet.")
        print("Start your Flask app once with db.create_all() to create the base table, then run this script.")
        conn.close()
        sys.exit(1)

    existing = get_existing_columns(cursor, "wellness_checkins")
    print(f"Existing columns: {sorted(existing)}\n")

    added = []
    skipped = []

    for col_name, col_def in MISSING_COLUMNS:
        if col_name in existing:
            skipped.append(col_name)
            print(f"  SKIP   {col_name}  (already exists)")
        else:
            sql = f"ALTER TABLE wellness_checkins ADD COLUMN {col_name} {col_def}"
            cursor.execute(sql)
            added.append(col_name)
            print(f"  ADDED  {col_name}  {col_def}")

    conn.commit()
    conn.close()

    print(f"\nDone. Added {len(added)} column(s), skipped {len(skipped)}.")
    if added:
        print(f"  New columns: {added}")
    print("\nRestart your Flask server now.")


if __name__ == "__main__":
    # Allow passing the db path as a command-line argument
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
        if not os.path.exists(db_path):
            print(f"ERROR: File not found: {db_path}")
            sys.exit(1)
    else:
        db_path = find_db()
        if not db_path:
            print("Could not find your SQLite database automatically.")
            print("Usage: python migrate_wellness.py path/to/your.db")
            print(f"Tried: {CANDIDATE_PATHS}")
            sys.exit(1)

    migrate(db_path)