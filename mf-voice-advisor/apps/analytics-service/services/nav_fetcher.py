"""
Fetch historical NAV data from mfapi.in for Indian mutual funds.

Endpoint: https://api.mfapi.in/mf/{schemeCode}
Uses synchronous httpx client.  Results are cached in-memory per session.
"""

import logging
from datetime import datetime, date

import httpx

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.mfapi.in/mf"

# ---------------------------------------------------------------------------
# In-memory cache  –  keyed by scheme_code (str)
# Stores the fully-parsed response: {"meta": {...}, "data": [{"date": ..., "nav": ...}, ...]}
# ---------------------------------------------------------------------------
_cache: dict[str, dict] = {}


def clear_cache() -> None:
    """Drop every cached entry."""
    _cache.clear()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _fetch_raw(scheme_code: str) -> dict:
    """
    Hit mfapi.in and return the raw JSON dict.

    Raises
    ------
    ConnectionError  – on any network / transport failure.
    ValueError       – on HTTP 404 or an unexpected status from the API.
    """
    url = f"{_BASE_URL}/{scheme_code}"
    try:
        response = httpx.get(url, timeout=30.0)
    except httpx.HTTPError as exc:
        raise ConnectionError(
            f"Network error while fetching NAV data for scheme {scheme_code}: {exc}"
        ) from exc

    if response.status_code == 404:
        raise ValueError(
            f"Scheme code '{scheme_code}' not found (HTTP 404)."
        )
    if response.status_code != 200:
        raise ConnectionError(
            f"Unexpected HTTP {response.status_code} for scheme {scheme_code}."
        )

    return response.json()


def _parse_nav_entry(entry: dict) -> dict | None:
    """
    Convert a single raw NAV entry to ``{"date": date, "nav": float}``.

    Returns ``None`` (and logs a warning) when the entry is unparseable.
    """
    raw_nav = entry.get("nav", "")
    raw_date = entry.get("date", "")

    # Skip N/A or blank NAV values
    if not raw_nav or raw_nav.strip().upper() == "N/A":
        return None

    try:
        nav_value = float(raw_nav)
    except (ValueError, TypeError):
        logger.warning("Skipping entry with unparseable NAV value: %r", raw_nav)
        return None

    try:
        date_value = datetime.strptime(raw_date, "%d-%m-%Y").date()
    except (ValueError, TypeError):
        logger.warning("Skipping entry with malformed date: %r", raw_date)
        return None

    return {"date": date_value, "nav": nav_value}


def _get_parsed(scheme_code: str) -> dict:
    """
    Return the parsed (and cached) response for *scheme_code*.

    The returned dict has two keys:
    - ``meta``:  fund metadata dict
    - ``data``:  list of ``{"date": date, "nav": float}`` sorted oldest-first
    """
    if scheme_code in _cache:
        return _cache[scheme_code]

    raw = _fetch_raw(scheme_code)

    # Validate top-level status
    if raw.get("status") != "SUCCESS":
        raise ValueError(
            f"API returned non-SUCCESS status for scheme {scheme_code}: "
            f"{raw.get('status')}"
        )

    raw_data = raw.get("data")
    if not raw_data:
        raise ValueError(
            f"No NAV data returned for scheme {scheme_code}."
        )

    # Parse & filter entries
    parsed_entries: list[dict] = []
    for entry in raw_data:
        parsed = _parse_nav_entry(entry)
        if parsed is not None:
            parsed_entries.append(parsed)

    if not parsed_entries:
        raise ValueError(
            f"All NAV entries for scheme {scheme_code} were unparseable or N/A."
        )

    # mfapi.in returns newest-first → sort oldest-first
    parsed_entries.sort(key=lambda e: e["date"])

    result = {
        "meta": raw.get("meta", {}),
        "data": parsed_entries,
    }

    _cache[scheme_code] = result
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_nav_history(scheme_code: str) -> list[dict]:
    """
    Fetch historical NAV data for an Indian mutual-fund scheme.

    Parameters
    ----------
    scheme_code : str
        The AMFI scheme code, e.g. ``"119551"``.

    Returns
    -------
    list[dict]
        Each element is ``{"date": datetime.date, "nav": float}``,
        sorted chronologically (oldest first).

    Raises
    ------
    ValueError
        If the scheme code is invalid or yields no usable data.
    ConnectionError
        On network / transport failures.
    """
    return _get_parsed(scheme_code)["data"]


def fetch_fund_metadata(scheme_code: str) -> dict:
    """
    Return fund metadata for the given scheme code.

    Parameters
    ----------
    scheme_code : str
        The AMFI scheme code.

    Returns
    -------
    dict
        Keys: ``fund_house``, ``scheme_name``, ``scheme_type``,
        ``scheme_category``, ``scheme_code``.

    Raises
    ------
    ValueError
        If the scheme code is invalid.
    ConnectionError
        On network / transport failures.
    """
    return _get_parsed(scheme_code)["meta"]
