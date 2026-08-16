import sys
import copy
from pathlib import Path
from bson import ObjectId
import pytest
from fastapi.testclient import TestClient

# Ensure ai-service root is in sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.db.mongodb import set_database
from app.main import app


class MockCursor:
    def __init__(self, items):
        self._items = items
        self._sort_key = None
        self._sort_dir = 1
        self._skip = 0
        self._limit = len(items)

    def sort(self, key, direction=1):
        self._sort_key = key
        self._sort_dir = direction
        return self

    def skip(self, n):
        self._skip = n
        return self

    def limit(self, n):
        self._limit = n
        return self

    async def to_list(self, length=None):
        items = list(self._items)
        if self._sort_key:
            items.sort(
                key=lambda x: str(x.get(self._sort_key, "")),
                reverse=(self._sort_dir == -1)
            )
        start = self._skip
        end = start + (self._limit if length is None else min(self._limit, length))
        return [copy.deepcopy(item) for item in items[start:end]]


class MockDeleteResult:
    def __init__(self, count):
        self.deleted_count = count


class MockInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class MockCollection:
    def __init__(self):
        self._docs = []

    def _matches(self, doc, query):
        for k, v in query.items():
            if k == "_id":
                if str(doc.get("_id")) != str(v):
                    return False
            elif isinstance(v, dict):
                if "$regex" in v:
                    pattern = v["$regex"].lower()
                    if pattern not in str(doc.get(k, "")).lower():
                        return False
                if "$gte" in v:
                    doc_val = doc.get(k)
                    if doc_val is None or doc_val < v["$gte"]:
                        return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    async def insert_one(self, doc):
        doc_copy = copy.deepcopy(doc)
        if "_id" not in doc_copy:
            doc_copy["_id"] = ObjectId()
        self._docs.append(doc_copy)
        return MockInsertResult(doc_copy["_id"])

    async def find_one(self, query):
        for d in self._docs:
            if self._matches(d, query):
                return copy.deepcopy(d)
        return None

    def find(self, query):
        matching = [d for d in self._docs if self._matches(d, query)]
        return MockCursor(matching)

    async def update_one(self, query, update, upsert=False):
        for i, d in enumerate(self._docs):
            if self._matches(d, query):
                if "$set" in update:
                    d.update(copy.deepcopy(update["$set"]))
                if "$inc" in update:
                    for ik, iv in update["$inc"].items():
                        d[ik] = d.get(ik, 0) + iv
                return {"modified_count": 1}
        if upsert:
            new_doc = copy.deepcopy(query)
            if "$set" in update:
                new_doc.update(copy.deepcopy(update["$set"]))
            if "$setOnInsert" in update:
                new_doc.update(copy.deepcopy(update["$setOnInsert"]))
            new_doc["_id"] = ObjectId()
            self._docs.append(new_doc)
            return {"upserted_id": new_doc["_id"]}
        return {"modified_count": 0}

    async def update_many(self, query, update):
        count = 0
        for d in self._docs:
            if self._matches(d, query):
                if "$set" in update:
                    d.update(copy.deepcopy(update["$set"]))
                if "$inc" in update:
                    for ik, iv in update["$inc"].items():
                        d[ik] = d.get(ik, 0) + iv
                count += 1
        class MockUpdateResult:
            def __init__(self, c):
                self.modified_count = c
        return MockUpdateResult(count)

    async def find_one_and_update(self, query, update, return_document=True):
        for d in self._docs:
            if self._matches(d, query):
                if "$set" in update:
                    d.update(copy.deepcopy(update["$set"]))
                if "$inc" in update:
                    for ik, iv in update["$inc"].items():
                        d[ik] = d.get(ik, 0) + iv
                return copy.deepcopy(d)
        return None

    async def delete_one(self, query):
        for i, d in enumerate(self._docs):
            if self._matches(d, query):
                self._docs.pop(i)
                return MockDeleteResult(1)
        return MockDeleteResult(0)

    async def delete_many(self, query):
        initial = len(self._docs)
        self._docs = [d for d in self._docs if not self._matches(d, query)]
        return MockDeleteResult(initial - len(self._docs))

    async def create_index(self, keys, **kwargs):
        return "index_created"


class MockDatabase:
    def __init__(self):
        self.users = MockCollection()
        self.portfolios = MockCollection()
        self.holdings = MockCollection()
        self.transactions = MockCollection()
        self.portfolio_snapshots = MockCollection()
        self.predictions = MockCollection()
        self.watchlists = MockCollection()
        self.portfolio_reports = MockCollection()
        self.notifications = MockCollection()
        self.audit_logs = MockCollection()


@pytest.fixture(autouse=True)
def mock_db():
    db = MockDatabase()
    set_database(db)
    yield db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def user1_headers():
    return {"Authorization": "Bearer mock_token_user_alpha"}


@pytest.fixture
def user2_headers():
    return {"Authorization": "Bearer mock_token_user_beta"}


@pytest.fixture
def sample_portfolio_payload():
    return {
        "portfolio_id": "PORT_TEST_001",
        "portfolio_data": {
            "annualized_return": 0.18,
            "annualized_volatility": 0.22,
            "portfolio_beta": 1.05,
            "asset_count": 8,
            "sector_count": 5,
            "portfolio_sharpe_ratio": 1.25,
            "portfolio_sortino_ratio": 1.6,
            "portfolio_calmar_ratio": 0.9,
            "diversification_score": 78.0,
            "portfolio_max_drawdown": -0.14,
            "return_1M": 0.03,
            "return_3M": 0.08,
            "return_6M": 0.15,
            "return_1Y": 0.22
        }
    }
