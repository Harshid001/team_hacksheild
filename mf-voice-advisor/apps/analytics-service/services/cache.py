"""
MongoDB caching layer for pre-computed fund metrics.

Stores computed metrics (CAGR, volatility, Sharpe ratio, max drawdown) in
MongoDB so that demo runs never depend on a live mfapi.in call.

Cache strategy:
  - Key: schemeCode (unique index)
  - TTL: 24 hours (checked via lastUpdated timestamp)
  - Upsert on store (safe to re-run seed script)
  - Graceful degradation: if MongoDB is unavailable, returns None (caller
    falls back to live computation)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# MongoDB connection  —  lazy singleton
# ---------------------------------------------------------------------------

_MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("MONGO_DB_NAME", "mf_voice_advisor")
_COLLECTION = "fundMetrics"

_client = None
_db = None


def _get_collection():
    """Return the fundMetrics collection, creating the connection lazily."""
    global _client, _db

    if _client is None:
        try:
            from pymongo import MongoClient

            _client = MongoClient(_MONGO_URI, serverSelectionTimeoutMS=5000)
            # Force a connection check
            _client.admin.command("ping")
            _db = _client[_DB_NAME]
            logger.info("Connected to MongoDB at %s (db: %s)", _MONGO_URI, _DB_NAME)
        except Exception as exc:
            logger.warning("MongoDB connection failed: %s — caching disabled", exc)
            _client = None
            _db = None
            return None

    if _db is None:
        return None

    return _db[_COLLECTION]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

CACHE_TTL_HOURS = 24


def get_cached_metrics(scheme_code: str) -> Optional[dict]:
    """
    Return cached metrics for *scheme_code* if fresh (< 24h old).

    Returns
    -------
    dict or None
        The cached document (with keys: schemeCode, schemeName, category,
        fundHouse, cagr, volatility, sharpeRatio, maxDrawdown, lastUpdated),
        or None if not cached / stale / MongoDB unavailable.
    """
    col = _get_collection()
    if col is None:
        return None

    try:
        doc = col.find_one({"schemeCode": scheme_code})
        if doc is None:
            return None

        # Check freshness
        last_updated = doc.get("lastUpdated")
        if last_updated is None:
            return None

        # Make both timezone-aware for comparison
        if last_updated.tzinfo is None:
            last_updated = last_updated.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)

        if now - last_updated > timedelta(hours=CACHE_TTL_HOURS):
            logger.info("Cache stale for %s (last updated: %s)", scheme_code, last_updated)
            return None

        # Remove MongoDB _id before returning
        doc.pop("_id", None)
        return doc

    except Exception as exc:
        logger.warning("Cache read failed for %s: %s", scheme_code, exc)
        return None


def store_metrics(
    scheme_code: str,
    scheme_name: str,
    category: str,
    fund_house: str,
    cagr: float,
    volatility: float,
    sharpe_ratio: float,
    max_drawdown: float,
    expense_ratio: float = 0.01,
) -> bool:
    """
    Upsert computed metrics for a fund into MongoDB.

    Returns True on success, False on failure (MongoDB unavailable, etc.).
    """
    col = _get_collection()
    if col is None:
        return False

    doc = {
        "schemeCode": scheme_code,
        "schemeName": scheme_name,
        "category": category,
        "fundHouse": fund_house,
        "cagr": round(cagr, 6),
        "volatility": round(volatility, 6),
        "sharpeRatio": round(sharpe_ratio, 6),
        "maxDrawdown": round(max_drawdown, 6),
        "expenseRatio": round(expense_ratio, 6),
        "lastUpdated": datetime.now(timezone.utc),
    }

    try:
        col.update_one(
            {"schemeCode": scheme_code},
            {"$set": doc},
            upsert=True,
        )
        logger.info("Cached metrics for %s (%s)", scheme_code, scheme_name)
        return True
    except Exception as exc:
        logger.warning("Cache write failed for %s: %s", scheme_code, exc)
        return False


def get_all_cached_metrics() -> list[dict]:
    """
    Return ALL cached fund metrics from MongoDB.

    Returns an empty list if MongoDB is unavailable or no documents exist.
    """
    col = _get_collection()
    if col is None:
        return []

    try:
        docs = list(col.find({}, {"_id": 0}))
        return docs
    except Exception as exc:
        logger.warning("Cache bulk read failed: %s", exc)
        return []


def clear_cache() -> bool:
    """Drop all cached metrics. Returns True on success."""
    col = _get_collection()
    if col is None:
        return False

    try:
        col.delete_many({})
        logger.info("Cache cleared")
        return True
    except Exception as exc:
        logger.warning("Cache clear failed: %s", exc)
        return False


def ensure_indexes() -> None:
    """Create required indexes (idempotent — safe to call on every startup)."""
    col = _get_collection()
    if col is None:
        return

    try:
        col.create_index("schemeCode", unique=True, name="idx_schemeCode_unique")
        logger.info("MongoDB indexes ensured for %s", _COLLECTION)
    except Exception as exc:
        logger.warning("Index creation failed: %s", exc)
