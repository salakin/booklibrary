"""Restore a backup made by scripts/backup.py into an empty database.

Usage:
  DATABASE_URL=<target database url> python scripts/restore_backup.py BACKUP.json

Uses the app's own models, so ids, timestamps, order and highlight flags are
preserved exactly. Refuses to touch a database that already has books or
posts, so it can't merge into or clobber live data by accident.
Run from a Python environment with the API's requirements installed
(e.g. api/.venv).
"""

import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "api"))

from sqlalchemy import func, text  # noqa: E402

import models  # noqa: E402
from database import Base, SessionLocal, engine  # noqa: E402


def parse_dt(value):
    return datetime.fromisoformat(value) if value else None


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding="utf-8") as f:
        backup = json.load(f)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(func.count(models.Book.id)).scalar() + db.query(func.count(models.Post.id)).scalar()
        if existing:
            sys.exit(f"Refusing to restore: the target database already has {existing} books/posts. "
                     "Restore into an empty database.")

        for b in backup["books"]:
            db.add(models.Book(id=b["id"], title=b["title"], author=b.get("author"),
                               created_at=parse_dt(b.get("created_at")), position=b.get("position")))
        db.flush()  # books must exist before posts reference them
        for p in backup["posts"]:
            db.add(models.Post(id=p["id"], book_id=p["book_id"], title=p["title"],
                               description=p["description"], created_at=parse_dt(p.get("created_at")),
                               position=p.get("position"), is_highlighted=p.get("is_highlighted", False)))
        db.commit()

        # Explicit ids bypass Postgres sequences; advance them past the restored
        # rows or the next insert collides with an existing id.
        if engine.dialect.name == "postgresql":
            with engine.begin() as conn:
                for table in ("books", "posts"):
                    conn.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {table}), 1))"
                    ))
    finally:
        db.close()

    print(f"Restored {len(backup['books'])} books and {len(backup['posts'])} posts "
          f"(backup taken {backup.get('exported_at', 'unknown')}).")


if __name__ == "__main__":
    main()
