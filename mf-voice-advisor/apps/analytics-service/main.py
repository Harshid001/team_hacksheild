"""
Analytics Service — FastAPI microservice for mutual-fund risk / return metrics.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models.schemas import (
    CachedFundMetrics,
    CachedMetricsListResponse,
    ComputeMetricsRequest,
    FundInfo,
    FundListResponse,
    FundMetricsRequest,
    FundMetricsResponse,
    MetricsResponse,
)
from services.metrics import compute_all_metrics, compute_daily_returns
from services.nav_fetcher import fetch_fund_metadata, fetch_nav_history
from services.cache import (
    get_cached_metrics,
    store_metrics,
    get_all_cached_metrics,
    ensure_indexes,
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create required MongoDB indexes on service start."""
    ensure_indexes()
    yield

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Analytics Service",
    description="Compute risk/return metrics for Indian mutual-fund NAV series.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---- CORS (allow everything for local dev) --------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


# (Removed deprecated startup event; handled by lifespan)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> datetime:
    """Try DD-MM-YYYY first, then fall back to YYYY-MM-DD."""
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unable to parse date: '{date_str}'. Expected DD-MM-YYYY or YYYY-MM-DD.")


# ---------------------------------------------------------------------------
# Curated fund list — 14 verified schemes across 6 categories
# ---------------------------------------------------------------------------

CURATED_FUNDS: List[dict] = [
    # Large Cap (3)
    {"schemeCode": "120503", "schemeName": "SBI Blue Chip Fund - Direct Plan - Growth", "category": "Large Cap", "fundHouse": "SBI Mutual Fund"},
    {"schemeCode": "120586", "schemeName": "ICICI Prudential Bluechip Fund - Direct Plan - Growth", "category": "Large Cap", "fundHouse": "ICICI Prudential Mutual Fund"},
    {"schemeCode": "119180", "schemeName": "HDFC Top 100 Fund - Direct Plan - Growth", "category": "Large Cap", "fundHouse": "HDFC Mutual Fund"},
    # Mid Cap (3)
    {"schemeCode": "118989", "schemeName": "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth", "category": "Mid Cap", "fundHouse": "HDFC Mutual Fund"},
    {"schemeCode": "125497", "schemeName": "Kotak Emerging Equity Fund - Direct Plan - Growth", "category": "Mid Cap", "fundHouse": "Kotak Mahindra Mutual Fund"},
    {"schemeCode": "120504", "schemeName": "SBI Magnum Midcap Fund - Direct Plan - Growth", "category": "Mid Cap", "fundHouse": "SBI Mutual Fund"},
    # Small Cap (2)
    {"schemeCode": "125307", "schemeName": "SBI Small Cap Fund - Direct Plan - Growth", "category": "Small Cap", "fundHouse": "SBI Mutual Fund"},
    {"schemeCode": "125354", "schemeName": "Nippon India Small Cap Fund - Direct Plan - Growth", "category": "Small Cap", "fundHouse": "Nippon India Mutual Fund"},
    # Flexi Cap (2)
    {"schemeCode": "122639", "schemeName": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", "category": "Flexi Cap", "fundHouse": "PPFAS Mutual Fund"},
    {"schemeCode": "125494", "schemeName": "Kotak Flexicap Fund - Direct Plan - Growth", "category": "Flexi Cap", "fundHouse": "Kotak Mahindra Mutual Fund"},
    # Hybrid (2)
    {"schemeCode": "119551", "schemeName": "ICICI Prudential Equity & Debt Fund - Direct Plan - Growth", "category": "Hybrid", "fundHouse": "ICICI Prudential Mutual Fund"},
    {"schemeCode": "118834", "schemeName": "HDFC Balanced Advantage Fund - Direct Plan - Growth", "category": "Hybrid", "fundHouse": "HDFC Mutual Fund"},
    # Debt (2)
    {"schemeCode": "135740", "schemeName": "HDFC Corporate Bond Fund - Direct Plan - Growth", "category": "Debt", "fundHouse": "HDFC Mutual Fund"},
    {"schemeCode": "119088", "schemeName": "SBI Magnum Medium Duration Fund - Direct Plan - Growth", "category": "Debt", "fundHouse": "SBI Mutual Fund"},
]

# Build a lookup for quick access
_FUND_BY_CODE = {f["schemeCode"]: f for f in CURATED_FUNDS}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok", "service": "analytics-service", "version": "1.0.0"}


@app.post("/compute-metrics", response_model=MetricsResponse)
async def compute_metrics(body: ComputeMetricsRequest):
    """
    Accept a raw NAV history and return computed risk/return metrics.
    """
    try:
        # Parse dates & extract NAV values
        dates = [_parse_date(entry.date) for entry in body.navHistory]
        navs = [entry.nav for entry in body.navHistory]

        # Build pandas structures
        date_series = pd.Series(dates)
        nav_series = pd.Series(navs, dtype=float)

        # Sort ascending by date
        sort_idx = date_series.argsort()
        date_series = date_series.iloc[sort_idx].reset_index(drop=True)
        nav_series = nav_series.iloc[sort_idx].reset_index(drop=True)

        risk_free_rate = body.riskFreeRate if body.riskFreeRate is not None else 0.07

        metrics = compute_all_metrics(nav_series, date_series, risk_free_rate)
        return MetricsResponse(**metrics)

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(exc)}")


@app.get("/fund-list", response_model=FundListResponse)
async def fund_list():
    """Return the curated list of 14 Indian mutual-fund schemes."""
    funds = [FundInfo(**f) for f in CURATED_FUNDS]
    return FundListResponse(funds=funds)


@app.post("/compute-fund-metrics", response_model=FundMetricsResponse)
async def compute_fund_metrics(body: FundMetricsRequest):
    """
    Convenience endpoint: pass a scheme code, and get back fund metadata
    plus all computed metrics in one shot.

    Checks MongoDB cache first; falls back to live fetch + compute.
    """
    try:
        scheme_code = body.schemeCode
        risk_free_rate = body.riskFreeRate if body.riskFreeRate is not None else 0.07

        # --- Try cache first ---
        cached = get_cached_metrics(scheme_code)
        if cached is not None:
            return FundMetricsResponse(
                schemeCode=cached["schemeCode"],
                schemeName=cached.get("schemeName", ""),
                fundHouse=cached.get("fundHouse", ""),
                schemeType=cached.get("category", ""),
                metrics=MetricsResponse(
                    cagr=cached["cagr"],
                    volatility=cached["volatility"],
                    sharpeRatio=cached["sharpeRatio"],
                    maxDrawdown=cached["maxDrawdown"],
                ),
            )

        # --- Cache miss: live fetch + compute ---
        nav_data = fetch_nav_history(scheme_code)
        metadata = fetch_fund_metadata(scheme_code)

        # Build pandas structures
        dates = pd.Series([_parse_date(str(entry["date"])) for entry in nav_data])
        navs = pd.Series([float(entry["nav"]) for entry in nav_data])

        # Sort ascending by date
        sort_idx = dates.argsort()
        dates = dates.iloc[sort_idx].reset_index(drop=True)
        navs = navs.iloc[sort_idx].reset_index(drop=True)

        metrics = compute_all_metrics(navs, dates, risk_free_rate)

        # Determine category from curated list if available
        fund_info = _FUND_BY_CODE.get(scheme_code, {})
        category = fund_info.get("category", metadata.get("scheme_category", ""))
        fund_house = metadata.get("fund_house", fund_info.get("fundHouse", ""))
        scheme_name = metadata.get("scheme_name", fund_info.get("schemeName", ""))

        # Cache the result for next time
        store_metrics(
            scheme_code=scheme_code,
            scheme_name=scheme_name,
            category=category,
            fund_house=fund_house,
            cagr=metrics["cagr"],
            volatility=metrics["volatility"],
            sharpe_ratio=metrics["sharpeRatio"],
            max_drawdown=metrics["maxDrawdown"],
            expense_ratio=0.01,
        )

        return FundMetricsResponse(
            schemeCode=scheme_code,
            schemeName=scheme_name,
            fundHouse=fund_house,
            schemeType=metadata.get("scheme_type", ""),
            metrics=MetricsResponse(**metrics),
        )

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(exc)}")


@app.get("/cached-metrics/{scheme_code}", response_model=CachedFundMetrics)
async def get_cached_fund_metrics(scheme_code: str):
    """
    Return pre-computed metrics from MongoDB cache for a single fund.

    Returns 404 if not cached. This endpoint is what the Node API should
    call during the demo — it never hits mfapi.in.
    """
    cached = get_cached_metrics(scheme_code)
    if cached is None:
        raise HTTPException(
            status_code=404,
            detail=f"No cached metrics for scheme {scheme_code}. Run seed_metrics.py first.",
        )
    return CachedFundMetrics(**cached)


@app.get("/cached-metrics", response_model=CachedMetricsListResponse)
async def get_all_cached():
    """
    Return ALL pre-computed metrics from MongoDB cache.

    Used by the Node API to load the full curated list with metrics
    in a single call.
    """
    all_cached = get_all_cached_metrics()
    funds = [CachedFundMetrics(**doc) for doc in all_cached]
    return CachedMetricsListResponse(funds=funds)


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    import os
    import sys
    import socket

    port = int(os.environ.get("PORT", 8005))
    
    # Manually check if the port is available before starting uvicorn,
    # because uvicorn catches the exception internally when reload=True.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
        except OSError:
            print(f"\n{'='*70}", file=sys.stderr)
            print(f"❌ ERROR: Port {port} is already in use by another application.", file=sys.stderr)
            print(f"To run this service on a different port (e.g., 8001), please run:", file=sys.stderr)
            print(f"\n    $env:PORT='8001'; python main.py\n", file=sys.stderr)
            print(f"{'='*70}\n", file=sys.stderr)
            sys.exit(1)

    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
