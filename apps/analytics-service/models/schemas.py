from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from datetime import datetime


class NavDataPoint(BaseModel):
    """Single NAV observation."""
    date: str  # Accept as string (DD-MM-YYYY or YYYY-MM-DD), will be parsed in service
    nav: float = Field(..., gt=0, description="Net Asset Value, must be positive")


class ComputeMetricsRequest(BaseModel):
    """Request body for POST /compute-metrics."""
    navHistory: List[NavDataPoint] = Field(..., min_length=2, description="NAV history, at least 2 points")
    riskFreeRate: Optional[float] = Field(default=0.07, ge=0, le=1, description="Annual risk-free rate, defaults to 0.07 (7%)")


class MetricsResponse(BaseModel):
    """Response from POST /compute-metrics."""
    cagr: float = Field(..., description="Compound Annual Growth Rate")
    volatility: float = Field(..., description="Annualized volatility")
    sharpeRatio: float = Field(..., description="Sharpe ratio")
    maxDrawdown: float = Field(..., description="Maximum drawdown (negative value)")


class FundInfo(BaseModel):
    """A single fund in the curated list."""
    schemeCode: str
    schemeName: str
    category: str  # large-cap, mid-cap, debt, hybrid, small-cap, flexi-cap
    fundHouse: str = Field(default="", description="Fund house / AMC name")


class FundListResponse(BaseModel):
    """Response from GET /fund-list."""
    funds: List[FundInfo]
    count: int = 0

    @model_validator(mode="before")
    @classmethod
    def set_count(cls, data):
        """Auto-set count from the length of the funds list."""
        if isinstance(data, dict):
            funds = data.get("funds", [])
            data["count"] = len(funds)
        return data


class HealthResponse(BaseModel):
    """Response from GET /health."""
    status: str = "ok"
    service: str = "analytics-service"
    version: str = "1.0.0"


class FundMetricsRequest(BaseModel):
    """Request body for POST /compute-fund-metrics."""
    schemeCode: str = Field(..., description="AMFI scheme code")
    riskFreeRate: Optional[float] = Field(default=0.07, ge=0, le=1, description="Annual risk-free rate, defaults to 0.07 (7%)")


class FundMetricsResponse(BaseModel):
    """Response from POST /compute-fund-metrics."""
    schemeCode: str
    schemeName: str
    fundHouse: str = ""
    schemeType: str = ""
    metrics: MetricsResponse


class CachedFundMetrics(BaseModel):
    """
    Represents a cached fund metrics document from MongoDB.
    Matches the FundMetrics Mongoose schema in the Master Doc.
    """
    schemeCode: str
    schemeName: str
    category: str
    fundHouse: str = ""
    cagr: float
    volatility: float
    sharpeRatio: float
    maxDrawdown: float
    expenseRatio: float = Field(default=0.01, description="Expense ratio (mocked to 1%)")
    lastUpdated: Optional[datetime] = None


class CachedMetricsListResponse(BaseModel):
    """Response from GET /cached-metrics (all cached metrics)."""
    funds: List[CachedFundMetrics]
    count: int = 0

    @model_validator(mode="before")
    @classmethod
    def set_count(cls, data):
        if isinstance(data, dict):
            funds = data.get("funds", [])
            data["count"] = len(funds)
        return data


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
