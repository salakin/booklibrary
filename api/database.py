import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./booklibrary.db")

# Providers hand out "postgres://" or bare "postgresql://" URLs. Name the
# driver explicitly: SQLAlchemy 2.1 changed the bare "postgresql://" default
# from psycopg2 to psycopg (v3), which isn't installed, so an unqualified URL
# crashes on startup. URLs that already name a driver are left alone.
for prefix in ("postgres://", "postgresql://"):
    if DATABASE_URL.startswith(prefix):
        DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len(prefix):]
        break

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# pool_pre_ping: Neon suspends idle databases, which silently kills pooled
# connections; without a ping the first request after a quiet spell hits a
# dead connection and fails with a 500.
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
