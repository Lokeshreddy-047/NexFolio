import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "nexfolio")

_client = None
_database = None


def get_database():
    global _client, _database
    if _database is not None:
        return _database

    try:
        _client = AsyncIOMotorClient(
            MONGODB_URI,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000,
        )
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