#!/usr/bin/env python3
"""
Seed script — pre-compute and cache metrics for all curated mutual funds.

Run this ONCE before the demo so that every request reads from MongoDB cache
instead of hitting mfapi.in live.

Usage:
    cd apps/analytics-service
    pip install -r requirements.txt
    python seed_metrics.py

Prerequisites:
    - MongoDB running on localhost:27017  (or set MONGO_URI env var)
    - Internet access (fetches NAV data from mfapi.in)
"""

from __future__ import annotations

import logging
import sys
import time
from datetime import datetime

import pandas as pd

# ---------------------------------------------------------------------------
# Configure logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("seed_metrics")

# ---------------------------------------------------------------------------
# Import project modules
# ---------------------------------------------------------------------------
from services.nav_fetcher import fetch_nav_history, fetch_fund_metadata
from services.metrics import compute_all_metrics
from services.cache import store_metrics, ensure_indexes, get_all_cached_metrics

# ---------------------------------------------------------------------------
# Curated fund list (must stay in sync with main.py CURATED_FUNDS)
# ---------------------------------------------------------------------------
CURATED_FUNDS = [
    # Large Cap
    {"schemeCode": "120503", "schemeName": "SBI Blue Chip Fund - Direct Plan - Growth", "category": "Large Cap", "fundHouse": "SBI Mutual Fund"},
    {"schemeCode": "120586", "schemeName": "ICICI Prudential Bluechip Fund - Direct Plan - Growth", "category": "Large Cap", "fundHouse": "ICICI Prudential Mutual Fund"},
    {"schemeCode": "119180", "schemeName": "HDFC Top 100 Fund - Direct Plan - Growth", "category": "Large Cap", "fundHouse": "HDFC Mutual Fund"},
    # Mid Cap
    {"schemeCode": "118989", "schemeName": "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth", "category": "Mid Cap", "fundHouse": "HDFC Mutual Fund"},
    {"schemeCode": "125497", "schemeName": "Kotak Emerging Equity Fund - Direct Plan - Growth", "category": "Mid Cap", "fundHouse": "Kotak Mahindra Mutual Fund"},
    {"schemeCode": "120504", "schemeName": "SBI Magnum Midcap Fund - Direct Plan - Growth", "category": "Mid Cap", "fundHouse": "SBI Mutual Fund"},
    # Small Cap
    {"schemeCode": "125307", "schemeName": "SBI Small Cap Fund - Direct Plan - Growth", "category": "Small Cap", "fundHouse": "SBI Mutual Fund"},
    {"schemeCode": "125354", "schemeName": "Nippon India Small Cap Fund - Direct Plan - Growth", "category": "Small Cap", "fundHouse": "Nippon India Mutual Fund"},
    # Flexi Cap
    {"schemeCode": "122639", "schemeName": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", "category": "Flexi Cap", "fundHouse": "PPFAS Mutual Fund"},
    {"schemeCode": "125494", "schemeName": "Kotak Flexicap Fund - Direct Plan - Growth", "category": "Flexi Cap", "fundHouse": "Kotak Mahindra Mutual Fund"},
    # Hybrid
    {"schemeCode": "119551", "schemeName": "ICICI Prudential Equity & Debt Fund - Direct Plan - Growth", "category": "Hybrid", "fundHouse": "ICICI Prudential Mutual Fund"},
    {"schemeCode": "118834", "schemeName": "HDFC Balanced Advantage Fund - Direct Plan - Growth", "category": "Hybrid", "fundHouse": "HDFC Mutual Fund"},
    # Debt
    {"schemeCode": "135740", "schemeName": "HDFC Corporate Bond Fund - Direct Plan - Growth", "category": "Debt", "fundHouse": "HDFC Mutual Fund"},
    {"schemeCode": "119088", "schemeName": "SBI Magnum Medium Duration Fund - Direct Plan - Growth", "category": "Debt", "fundHouse": "SBI Mutual Fund"},
]


def _parse_date(date_str: str) -> datetime:
    """Parse DD-MM-YYYY or YYYY-MM-DD."""
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unable to parse date: '{date_str}'")


def seed_one_fund(fund: dict, risk_free_rate: float = 0.07) -> dict | None:
    """
    Fetch NAV history, compute metrics, and cache for a single fund.

    Returns the computed metrics dict on success, or None on failure.
    """
    code = fund["schemeCode"]
    name = fund["schemeName"]

    logger.info("━━━ Processing: %s [%s] ━━━", name, code)
    t0 = time.time()

    try:
        # 1. Fetch NAV history
        logger.info("  Fetching NAV history from mfapi.in ...")
        nav_data = fetch_nav_history(code)
        logger.info("  Got %d NAV data points", len(nav_data))

        # 2. Build pandas structures
        dates = pd.Series([_parse_date(str(entry["date"])) for entry in nav_data])
        navs = pd.Series([float(entry["nav"]) for entry in nav_data])

        # Sort ascending by date
        sort_idx = dates.argsort()
        dates = dates.iloc[sort_idx].reset_index(drop=True)
        navs = navs.iloc[sort_idx].reset_index(drop=True)

        # 3. Compute metrics
        logger.info("  Computing CAGR, volatility, Sharpe ratio, max drawdown ...")
        metrics = compute_all_metrics(navs, dates, risk_free_rate)

        # 4. Try to get real metadata from the API
        try:
            metadata = fetch_fund_metadata(code)
            actual_name = metadata.get("scheme_name", name)
            actual_house = metadata.get("fund_house", fund["fundHouse"])
        except Exception:
            actual_name = name
            actual_house = fund["fundHouse"]

        # 5. Store in MongoDB
        logger.info("  Caching in MongoDB ...")
        stored = store_metrics(
            scheme_code=code,
            scheme_name=actual_name,
            category=fund["category"],
            fund_house=actual_house,
            cagr=metrics["cagr"],
            volatility=metrics["volatility"],
            sharpe_ratio=metrics["sharpeRatio"],
            max_drawdown=metrics["maxDrawdown"],
            expense_ratio=0.01,  # Mocked expense ratio as mfapi.in doesn't provide it
        )

        elapsed = time.time() - t0

        if stored:
            logger.info(
                "  ✓ Done in %.1fs — CAGR: %.2f%%, Vol: %.2f%%, Sharpe: %.3f, MaxDD: %.2f%%",
                elapsed,
                metrics["cagr"] * 100,
                metrics["volatility"] * 100,
                metrics["sharpeRatio"],
                metrics["maxDrawdown"] * 100,
            )
            return metrics
        else:
            logger.warning("  ⚠ Metrics computed but MongoDB store failed (%.1fs)", elapsed)
            return metrics

    except Exception as exc:
        elapsed = time.time() - t0
        logger.error("  ✗ FAILED in %.1fs: %s", elapsed, exc)
        return None


def main():
    """Seed all curated funds."""
    print()
    print("=" * 70)
    print("  SEED SCRIPT — Pre-computing metrics for all curated funds")
    print("=" * 70)
    print()

    # Ensure MongoDB indexes
    ensure_indexes()

    total = len(CURATED_FUNDS)
    succeeded = 0
    failed = 0
    results = []

    t_start = time.time()

    for i, fund in enumerate(CURATED_FUNDS, 1):
        print(f"\n[{i}/{total}]")
        metrics = seed_one_fund(fund)
        if metrics is not None:
            succeeded += 1
            results.append({**fund, **metrics})
        else:
            failed += 1

        # Brief pause between API calls to be polite
        if i < total:
            time.sleep(0.5)

    t_total = time.time() - t_start

    # -----------------------------------------------------------------------
    # Print summary
    # -----------------------------------------------------------------------
    print()
    print("=" * 70)
    print(f"  SEED COMPLETE — {succeeded} succeeded, {failed} failed, {total} total")
    print(f"  Total time: {t_total:.1f}s")
    print("=" * 70)
    print()

    if results:
        # Print a nice summary table
        print(f"{'Code':<8} {'Category':<12} {'CAGR':>8} {'Vol':>8} {'Sharpe':>8} {'MaxDD':>8}  Scheme Name")
        print("-" * 100)
        for r in results:
            print(
                f"{r['schemeCode']:<8} {r['category']:<12} "
                f"{r.get('cagr', 0) * 100:>7.2f}% "
                f"{r.get('volatility', 0) * 100:>7.2f}% "
                f"{r.get('sharpeRatio', 0):>8.3f} "
                f"{r.get('maxDrawdown', 0) * 100:>7.2f}%  "
                f"{r['schemeName'][:50]}"
            )
        print()

    # Verify MongoDB state
    cached = get_all_cached_metrics()
    print(f"MongoDB fundMetrics collection: {len(cached)} documents")
    print()

    if failed > 0:
        logger.warning("%d fund(s) failed — check logs above for details", failed)
        sys.exit(1)


if __name__ == "__main__":
    main()
