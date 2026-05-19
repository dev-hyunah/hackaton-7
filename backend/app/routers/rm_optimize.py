"""
RM 최적화 API — EMSRb + Dynamic Pricing 통합 엔드포인트
"""
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.pricing import recommend_prices

router = APIRouter(prefix="/api/rm", tags=["rm-optimize"])


class OptimizeRequest(BaseModel):
    prestige_base_price: float = Field(..., description="프레스티지 기본 운임")
    prestige_remaining: int = Field(..., description="프레스티지 잔여 좌석 수")
    economy_normal_fare: float = Field(..., description="일반석 정상 현재 운임")
    economy_discount_fare: float = Field(..., description="일반석 할인 현재 운임")
    economy_special_fare: float = Field(..., description="일반석 특가 현재 운임")
    economy_normal_sold: int = Field(0, description="정상 판매 좌석 수")
    economy_discount_sold: int = Field(0, description="할인 판매 좌석 수")
    economy_special_sold: int = Field(0, description="특가 판매 좌석 수")
    economy_normal_seats: int = Field(30, description="정상 전체 좌석 수")
    economy_discount_seats: int = Field(85, description="할인 전체 좌석 수")
    economy_special_seats: int = Field(50, description="특가 전체 좌석 수")
    dtd: int = Field(30, description="출발까지 남은 일수 (Days to Departure)")
    search_traffic_ratio: float = Field(1.0, description="평소 대비 검색 트래픽 비율 (1.0=보통)")
    competitor_price: float = Field(0.0, description="경쟁사 동일 노선 대표 운임 (0=미제공)")


class ScenarioRequest(BaseModel):
    scenario: str = Field(..., description="A | B | C")
    route: str = Field("GMP-CJU", description="노선")


@router.post("/optimize")
def optimize(req: OptimizeRequest) -> dict:
    """
    EMSRb + Dynamic Pricing 통합 최적화.
    현재 예약 상황을 입력받아 클래스별 권장 운임과 예약 한도를 반환.
    """
    result = recommend_prices(
        prestige_base=req.prestige_base_price,
        prestige_remaining=req.prestige_remaining,
        economy_normal_fare=req.economy_normal_fare,
        economy_discount_fare=req.economy_discount_fare,
        economy_special_fare=req.economy_special_fare,
        economy_normal_sold=req.economy_normal_sold,
        economy_discount_sold=req.economy_discount_sold,
        economy_special_sold=req.economy_special_sold,
        economy_normal_seats=req.economy_normal_seats,
        economy_discount_seats=req.economy_discount_seats,
        economy_special_seats=req.economy_special_seats,
        dtd=req.dtd,
        search_traffic_ratio=req.search_traffic_ratio,
        competitor_price=req.competitor_price,
    )
    return {"status": "ok", "recommendations": result}


@router.post("/simulate-scenario")
def simulate_scenario(req: ScenarioRequest) -> dict:
    """
    가이드북 시나리오 A/B/C 시뮬레이션.
    각 시나리오 입력값으로 최적화 결과를 반환.
    """
    scenarios: dict[str, dict] = {
        "A": {
            # 비수기 주중, DTD 14, 예약률 30% 이하
            "prestige_base_price": 300000, "prestige_remaining": 7,
            "economy_normal_fare": 150000, "economy_discount_fare": 110000, "economy_special_fare": 75000,
            "economy_normal_sold": 5, "economy_discount_sold": 20, "economy_special_sold": 10,
            "economy_normal_seats": 30, "economy_discount_seats": 85, "economy_special_seats": 50,
            "dtd": 14, "search_traffic_ratio": 0.6, "competitor_price": 70000,
        },
        "B": {
            # 대형 이벤트, 검색 400% 급증, DTD 45
            "prestige_base_price": 300000, "prestige_remaining": 6,
            "economy_normal_fare": 150000, "economy_discount_fare": 110000, "economy_special_fare": 75000,
            "economy_normal_sold": 10, "economy_discount_sold": 30, "economy_special_sold": 20,
            "economy_normal_seats": 30, "economy_discount_seats": 85, "economy_special_seats": 50,
            "dtd": 45, "search_traffic_ratio": 4.0, "competitor_price": 0,
        },
        "C": {
            # 경쟁사 특가 기습 인하, 당사 예약률 열위
            "prestige_base_price": 300000, "prestige_remaining": 8,
            "economy_normal_fare": 150000, "economy_discount_fare": 110000, "economy_special_fare": 75000,
            "economy_normal_sold": 5, "economy_discount_sold": 15, "economy_special_sold": 8,
            "economy_normal_seats": 30, "economy_discount_seats": 85, "economy_special_seats": 50,
            "dtd": 21, "search_traffic_ratio": 0.9, "competitor_price": 60000,
        },
    }
    if req.scenario not in scenarios:
        return {"status": "error", "message": "scenario must be A, B, or C"}
    params = scenarios[req.scenario]
    result = recommend_prices(**params)  # type: ignore[arg-type]
    return {"status": "ok", "scenario": req.scenario, "route": req.route, "recommendations": result}
