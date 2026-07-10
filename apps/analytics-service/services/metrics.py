"""
Pure financial metric calculations.
No FastAPI dependency — these are independently testable functions.
All functions operate on pandas Series / DataFrames.
"""

import numpy as np
import pandas as pd
from typing import List, Tuple


def compute_cagr(
    navs: pd.Series,
    dates: pd.Series,
) -> float:
    """
    Compound Annual Growth Rate.

    Formula:
        CAGR = (ending_nav / beginning_nav) ^ (1 / years) - 1

    `years` is derived from the ACTUAL date range in the data,
    not an assumed period. Uses calendar days / 365.25 for precision.

    Args:
        navs:  Series of NAV values (float), ordered chronologically.
        dates: Series of datetime objects, same length as navs.

    Returns:
        CAGR as a decimal (e.g. 0.12 means 12%).

    Raises:
        ValueError: if fewer than 2 data points or beginning NAV is zero.
    """
    if len(navs) < 2:
        raise ValueError("Need at least 2 NAV data points to compute CAGR")

    beginning_nav = float(navs.iloc[0])
    ending_nav = float(navs.iloc[-1])

    if beginning_nav <= 0:
        raise ValueError(f"Beginning NAV must be positive, got {beginning_nav}")

    start_date = pd.Timestamp(dates.iloc[0])
    end_date = pd.Timestamp(dates.iloc[-1])
    years = (end_date - start_date).days / 365.25

    if years <= 0:
        raise ValueError(
            f"Date range must be positive, got {years:.4f} years "
            f"({start_date} to {end_date})"
        )

    cagr = (ending_nav / beginning_nav) ** (1.0 / years) - 1.0
    return round(cagr, 6)


def compute_daily_returns(navs: pd.Series) -> pd.Series:
    """
    Compute simple daily returns from a NAV series.

    Formula:
        r_t = (NAV_t - NAV_{t-1}) / NAV_{t-1}

    Returns:
        Series of daily returns (first element is NaN, dropped).
    """
    returns = navs.pct_change().dropna()
    return returns


def compute_volatility(
    navs: pd.Series,
    annualization_factor: int = 252,
) -> float:
    """
    Annualized volatility (standard deviation of returns).

    Formula:
        volatility = std(daily_returns) * sqrt(trading_days_per_year)

    Uses 252 trading days/year by default (standard for Indian equity markets).
    Uses sample std (ddof=1) for an unbiased estimator.

    Args:
        navs: Series of NAV values, ordered chronologically.
        annualization_factor: Trading days per year (default 252).

    Returns:
        Annualized volatility as a decimal.
    """
    daily_returns = compute_daily_returns(navs)

    if len(daily_returns) < 2:
        raise ValueError("Need at least 3 NAV points to compute volatility")

    daily_std = daily_returns.std(ddof=1)
    annualized_vol = daily_std * np.sqrt(annualization_factor)
    return round(float(annualized_vol), 6)


def compute_sharpe_ratio(
    navs: pd.Series,
    dates: pd.Series,
    risk_free_rate: float = 0.07,
    annualization_factor: int = 252,
) -> float:
    """
    Sharpe Ratio — risk-adjusted return.

    Formula:
        Sharpe = (annualized_return - risk_free_rate) / annualized_volatility

    Where:
        - annualized_return = CAGR (computed from actual date range)
        - risk_free_rate defaults to 0.07 (7%, approximate Indian T-bill yield)
        - annualized_volatility = std(daily_returns) * sqrt(252)

    Args:
        navs:  Series of NAV values, ordered chronologically.
        dates: Series of datetime objects.
        risk_free_rate: Annual risk-free rate as decimal (default 0.07 = 7%).
        annualization_factor: Trading days per year (default 252).

    Returns:
        Sharpe ratio (dimensionless). Higher is better.
        Returns 0.0 if volatility is zero (no risk, no excess return).
    """
    annualized_return = compute_cagr(navs, dates)
    vol = compute_volatility(navs, annualization_factor)

    if vol == 0:
        return 0.0

    sharpe = (annualized_return - risk_free_rate) / vol
    return round(sharpe, 6)


def compute_max_drawdown(navs: pd.Series) -> float:
    """
    Maximum Drawdown — largest peak-to-trough decline.

    Algorithm:
        1. Track the running maximum (peak) of the NAV series.
        2. At each point, compute drawdown = (NAV - peak) / peak.
        3. Return the most negative drawdown (largest loss from a peak).

    Returns:
        Max drawdown as a NEGATIVE decimal (e.g. -0.25 means a 25% decline).
        Returns 0.0 if the series never declines.
    """
    if len(navs) < 2:
        raise ValueError("Need at least 2 NAV data points for max drawdown")

    cumulative_max = navs.cummax()
    drawdowns = (navs - cumulative_max) / cumulative_max
    max_dd = drawdowns.min()
    return round(float(max_dd), 6)


def compute_all_metrics(
    navs: pd.Series,
    dates: pd.Series,
    risk_free_rate: float = 0.07,
    annualization_factor: int = 252,
) -> dict:
    """
    Convenience function: compute all four metrics in one call.

    Returns:
        dict with keys: cagr, volatility, sharpeRatio, maxDrawdown
    """
    return {
        "cagr": compute_cagr(navs, dates),
        "volatility": compute_volatility(navs, annualization_factor),
        "sharpeRatio": compute_sharpe_ratio(
            navs, dates, risk_free_rate, annualization_factor
        ),
        "maxDrawdown": compute_max_drawdown(navs),
    }
