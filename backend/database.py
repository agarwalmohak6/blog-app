# =============================================================================
# database.py — Async PostgreSQL connection with SQLAlchemy
# =============================================================================
# CONCEPT: Why async?
#   Traditional (sync) DB calls BLOCK the event loop — FastAPI can't handle
#   other requests while waiting for DB. Async lets FastAPI serve 1000s of
#   concurrent requests while DB queries are in-flight.
# Docs: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
# =============================================================================

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
import os

# -----------------------------------------------------------------------------
# DATABASE URL
# CONCEPT: Connection strings encode all connection info in one string.
# Format: dialect+driver://user:password@host:port/dbname
# We use asyncpg driver (async PostgreSQL driver) instead of psycopg2 (sync).
# Docs: https://magicstack.github.io/asyncpg/current/
# -----------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:password@localhost:5432/blogapp"  # default for local dev
)

# -----------------------------------------------------------------------------
# ENGINE
# CONCEPT: The engine is the "factory" that manages DB connections.
# echo=True logs every SQL query — great for learning/debugging, turn off in prod.
# pool_size: how many connections to keep open (reuse = faster than reconnecting)
# -----------------------------------------------------------------------------
engine = create_async_engine(
    DATABASE_URL,
    echo=False,           # set to True only when debugging SQL queries
    pool_size=10,         # max persistent connections in pool
    max_overflow=20,      # extra connections allowed beyond pool_size under load
    pool_pre_ping=True,   # test connection health before using it (prevents stale conn errors)
    pool_recycle=1800,    # recycle connections every 30 min (prevents "server closed" errors)
)

# -----------------------------------------------------------------------------
# SESSION FACTORY
# CONCEPT: A "session" represents a single unit of work with the DB.
# async_sessionmaker creates session objects we use to run queries.
# expire_on_commit=False means objects stay usable after commit (important for async).
# -----------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# -----------------------------------------------------------------------------
# BASE CLASS
# CONCEPT: DeclarativeBase is the parent class for all our ORM models.
# ORM (Object Relational Mapper) = write Python classes, SQLAlchemy converts
# them to SQL tables. You never write raw CREATE TABLE SQL.
# Docs: https://docs.sqlalchemy.org/en/20/orm/declarative_styles.html
# -----------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass

# -----------------------------------------------------------------------------
# DEPENDENCY INJECTION — get_db()
# CONCEPT: FastAPI's dependency injection system.
# Every route that needs DB access declares `db: AsyncSession = Depends(get_db)`.
# FastAPI calls get_db(), injects the session, and closes it when done.
# `yield` makes this a "generator dependency" — code after yield runs on cleanup.
# Docs: https://fastapi.tiangolo.com/tutorial/dependencies/
# -----------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session          # give the session to the route handler
            await session.commit() # auto-commit if no exception occurred
        except Exception:
            await session.rollback()  # undo changes on error
            raise                     # re-raise so FastAPI returns a 500
