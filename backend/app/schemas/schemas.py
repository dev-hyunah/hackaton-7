from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator


class BookingClassSchema(BaseModel):
    class_code: str
    tier: str
    status: str
    current_price: int
    ai_recommended_price: Optional[int] = None
    sold_seats: int
    total_seats: int


class FlightFareSchema(BaseModel):
    flight_id: str
    flight_number: str
    route: str
    departure_time: str
    time_slot: str
    load_factor: float
    pace: float
    current_price: int
    ai_recommended_price: Optional[int] = None
    status: str
    classes: list[BookingClassSchema]
    base_cost: int
    analysis_reason: str


class FareUpdateRequest(BaseModel):
    class_code: str
    new_price: int
    updated_by: str = "RM"

    @field_validator("new_price")
    @classmethod
    def price_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("price must be positive")
        return v


class FareUpdateResponse(BaseModel):
    flight_id: str
    class_code: str
    old_price: int
    new_price: int
    updated_at: str


class PriceHistorySchema(BaseModel):
    id: str
    fare_tier_id: str
    class_code: str
    change_type: str
    price_before: int
    price_after: int
    changed_by: str
    changed_at: str


class AiRecommendationSchema(BaseModel):
    recommendation_id: str
    flight_id: str
    flight_number: str
    route: str
    departure_time: str
    class_code: str
    tier: str
    current_price: int
    recommended_price: int
    rationale: str
    change_percent: float
    confidence: float
    predicted_load_factor: float
    requires_manual_approval: bool = True
    status: str
    created_at: str


class ApprovalRequest(BaseModel):
    approved_by: str = "RM"


class RejectionRequest(BaseModel):
    rejected_by: str = "RM"


class ApprovalResponse(BaseModel):
    recommendation_id: str
    status: str
    updated_price: int


class RejectionResponse(BaseModel):
    recommendation_id: str
    status: str


class CompetitorPriceSchema(BaseModel):
    route: str
    airline: str
    booking_class: str
    fare: int
    date: str


class PriceComparisonSchema(BaseModel):
    route: str
    date: str
    my_fares: dict[str, int]
    competitors: list[CompetitorPriceSchema]


class SimulationParamsSchema(BaseModel):
    route: str
    date: str
    fuel_change_percent: float = 0.0
    new_competitor_entry: bool = False
    price_change_percent: float = 0.0


class SimulationChartPoint(BaseModel):
    month: str
    baseline: int
    simulation: int
    lf: float


class SimulationResultSchema(BaseModel):
    expected_demand_change: float
    expected_revenue_change: float
    optimal_price_range: dict[str, float]
    chart_data: list[SimulationChartPoint]


class RoutePerformanceSchema(BaseModel):
    route: str
    revenue: int
    target: int
    load_factor: float


class YieldTrendSchema(BaseModel):
    month: str
    yield_: float
    target: float


class AiStatsSchema(BaseModel):
    approved_count: int
    rejected_count: int


class RevenueDataPointSchema(BaseModel):
    date: str
    revenue: int
    bookings: int


class ReportSchema(BaseModel):
    report_id: str
    route: Optional[str]
    period_start: str
    period_end: str
    total_revenue: int
    total_target: int
    achieve_rate: float
    route_performance: list[RoutePerformanceSchema]
    yield_trend: list[YieldTrendSchema]
    ai_stats: AiStatsSchema
    revenue_history: list[RevenueDataPointSchema]
    created_at: str


class ReportRequest(BaseModel):
    route: Optional[str] = None
    period_start: date
    period_end: date


class EmailRequest(BaseModel):
    report_id: str
    recipient_email: str


class DashboardSummarySchema(BaseModel):
    total_revenue: int
    total_bookings: int
    avg_load_factor: float
    pending_recommendations: int


class ClassContext(BaseModel):
    code: str
    name: str
    seats: int
    sold: int
    price: int
    status: str


class StrategyAnalysisRequest(BaseModel):
    issue_text: str
    route: str
    flight_id: str
    classes: list[ClassContext] = []
    force_relevant: bool = False


class ClassAdjustment(BaseModel):
    code: str
    name: str
    current_price: int
    recommended_price: int
    reason: str


class StrategyAnalysisSchema(BaseModel):
    strategy_id: str
    description: str
    flight_id: str
    recommended_price: int
    irrelevant: bool = False
    class_adjustments: list[ClassAdjustment] = []
    created_at: str


class StrategyApprovalRequest(BaseModel):
    strategy_id: str
