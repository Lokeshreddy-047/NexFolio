import os
import certifi
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
DATABASE_NAME = os.getenv("MONGODB_DATABASE") or os.getenv("MONGODB_DB_NAME") or "nexfolio"

_client = None
_database = None


def get_client():
    global _client, _database
    if _client is not None:
        return _client
    if _database is not None and hasattr(_database, "client"):
        return _database.client
    get_database()
    return _client


@asynccontextmanager
async def get_db_session():
    """
    Yields an active database session for atomic multi-document operations.
    If the deployment is standalone, in-memory mock, or doesn't support transactions,
    it falls back gracefully to yielding None so single operations proceed normally.
    """
    client = get_client()
    if client is None or not hasattr(client, "start_session"):
        yield None
        return

    try:
        session = await client.start_session()
    except Exception as exc:
        yield None
        return

    tx_active = False
    try:
        try:
            tx_cm = session.start_transaction()
            if hasattr(tx_cm, "__aenter__"):
                async with tx_cm:
                    tx_active = True
                    yield session
            else:
                tx_active = True
                yield session
        except Exception:
            if not tx_active:
                yield None
            else:
                raise
    finally:
        try:
            if hasattr(session, "end_session"):
                await session.end_session()
        except Exception:
            pass


def get_database():
    global _client, _database
    if _database is not None:
        return _database

    try:
        is_tls = (
            "mongodb+srv://" in MONGODB_URI
            or "tls=true" in MONGODB_URI.lower()
            or "ssl=true" in MONGODB_URI.lower()
        )
        kwargs = {"serverSelectionTimeoutMS": 5000}
        if is_tls:
            kwargs["tlsCAFile"] = certifi.where()

        _client = AsyncIOMotorClient(MONGODB_URI, **kwargs)
        _database = _client[DATABASE_NAME]
    except Exception as exc:
        print(f"[MongoDB] Client initialization warning: {exc}")
        _client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        _database = _client[DATABASE_NAME]

    return _database


def set_database(db):
    """Allows test fixtures to inject an in-memory database."""
    global _database
    _database = db


async def ensure_db_indexes():
    """
    Creates institutional compound indexes for high-throughput queries.
    """
    try:
        db = get_database()
        # 1. Snapshots index
        await db.portfolio_snapshots.create_index(
            [("user_id", 1), ("portfolio_id", 1), ("timestamp", -1)],
            background=True
        )
        # 2. Transactions index
        await db.transactions.create_index(
            [("user_id", 1), ("portfolio_id", 1), ("transaction_date", -1)],
            background=True
        )
        # 3. Holdings index
        await db.holdings.create_index(
            [("user_id", 1), ("portfolio_id", 1)],
            background=True
        )
        # 4. Portfolios index
        await db.portfolios.create_index(
            [("user_id", 1), ("created_at", -1)],
            background=True
        )
    except Exception as exc:
        print(f"[MongoDB] Index creation skipped or deferred: {exc}")