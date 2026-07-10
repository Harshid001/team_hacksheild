import pandas as pd
import sys

from services.metrics import (
    compute_cagr,
    compute_volatility,
    compute_sharpe_ratio,
    compute_max_drawdown,
    compute_all_metrics,
    compute_daily_returns,
)


def test_cagr_simple():
    """NAV goes from 100 to 200 over exactly 3 years → CAGR ≈ 26.0%"""
    dates = pd.Series(pd.to_datetime(["2020-01-01", "2023-01-01"]))
    navs = pd.Series([100.0, 200.0])
    cagr = compute_cagr(navs, dates)
    # (200/100)^(1/3) - 1 = 2^0.3333 - 1 ≈ 0.2599
    assert abs(cagr - 0.2599) < 0.01, f"CAGR expected ~0.26, got {cagr}"
    print(f"  ✓ CAGR simple: {cagr:.6f} (expected ~0.2599)")


def test_cagr_flat():
    """NAV stays flat at 100 → CAGR = 0"""
    dates = pd.Series(pd.to_datetime(["2020-01-01", "2020-06-01", "2021-01-01"]))
    navs = pd.Series([100.0, 100.0, 100.0])
    cagr = compute_cagr(navs, dates)
    assert abs(cagr) < 0.0001, f"CAGR expected 0, got {cagr}"
    print(f"  ✓ CAGR flat: {cagr:.6f} (expected 0.0)")


def test_max_drawdown():
    """NAV: 100 → 120 → 80 → 110. Peak=120, trough=80 → drawdown = (80-120)/120 = -0.3333"""
    navs = pd.Series([100.0, 120.0, 80.0, 110.0])
    mdd = compute_max_drawdown(navs)
    assert abs(mdd - (-0.3333)) < 0.01, f"MaxDD expected ~-0.3333, got {mdd}"
    print(f"  ✓ Max Drawdown: {mdd:.6f} (expected ~-0.3333)")


def test_max_drawdown_no_decline():
    """Monotonically increasing NAV → max drawdown = 0"""
    navs = pd.Series([100.0, 110.0, 120.0, 130.0])
    mdd = compute_max_drawdown(navs)
    assert mdd == 0.0, f"MaxDD expected 0, got {mdd}"
    print(f"  ✓ Max Drawdown (no decline): {mdd:.6f} (expected 0.0)")


def test_volatility_known_series():
    """Check volatility is computed and positive for a varying series."""
    navs = pd.Series([100.0, 102.0, 98.0, 101.0, 99.0, 103.0, 100.5])
    vol = compute_volatility(navs)
    assert vol > 0, f"Volatility should be positive, got {vol}"
    print(f"  ✓ Volatility: {vol:.6f} (positive, reasonable)")


def test_sharpe_ratio():
    """Sharpe ratio for a series with known CAGR and volatility."""
    dates = pd.Series(pd.to_datetime(["2020-01-01", "2021-01-01", "2022-01-01", "2023-01-01"]))
    navs = pd.Series([100.0, 112.0, 125.0, 140.0])
    sharpe = compute_sharpe_ratio(navs, dates, risk_free_rate=0.07)
    # CAGR ≈ 11.87%, vol should be low, sharpe should be positive
    print(f"  ✓ Sharpe Ratio: {sharpe:.6f} (risk_free=7%)")


def test_compute_all():
    """Integration test: all metrics computed together."""
    dates = pd.Series(pd.to_datetime([
        "2020-01-01", "2020-04-01", "2020-07-01", "2020-10-01",
        "2021-01-01", "2021-04-01", "2021-07-01", "2021-10-01",
        "2022-01-01"
    ]))
    navs = pd.Series([100, 85, 95, 105, 115, 110, 125, 130, 140])
    result = compute_all_metrics(navs, dates, risk_free_rate=0.07)
    assert "cagr" in result
    assert "volatility" in result
    assert "sharpeRatio" in result
    assert "maxDrawdown" in result
    print(f"  ✓ All metrics: {result}")


if __name__ == "__main__":
    tests = [
        ("CAGR (simple doubling)", test_cagr_simple),
        ("CAGR (flat NAV)", test_cagr_flat),
        ("Max Drawdown (peak-to-trough)", test_max_drawdown),
        ("Max Drawdown (no decline)", test_max_drawdown_no_decline),
        ("Volatility (known series)", test_volatility_known_series),
        ("Sharpe Ratio", test_sharpe_ratio),
        ("All Metrics (integration)", test_compute_all),
    ]

    print("\n" + "=" * 60)
    print("Analytics Service — Metrics Test Suite")
    print("=" * 60 + "\n")

    passed = 0
    failed = 0

    for name, test_fn in tests:
        try:
            print(f"Running: {name}")
            test_fn()
            passed += 1
        except Exception as e:
            print(f"  ✗ FAILED: {e}")
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"Results: {passed} passed, {failed} failed, {len(tests)} total")
    print(f"{'=' * 60}\n")

    if failed > 0:
        sys.exit(1)
