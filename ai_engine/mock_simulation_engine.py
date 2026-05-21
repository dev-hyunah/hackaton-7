import math
from ai_engine.interfaces import AbstractSimulationEngine

BASE_REVENUE = 54_000_000
BASE_LF = 72
BASE_DEMAND = 520

# IATA Economics / ICAO Demand Elasticity Studies 기준
# 단거리 아시아 국내선 등급별 가격탄력성
CLASS_ELASTICITY = {
    "C": {"tier": "프레스티지", "elasticity": -0.45, "share": 0.05},
    "Y": {"tier": "일반 정상",  "elasticity": -0.95, "share": 0.20},
    "M": {"tier": "일반 할인",  "elasticity": -1.35, "share": 0.45},
    "V": {"tier": "특가",       "elasticity": -1.75, "share": 0.30},
}

FUEL_LF_SENSITIVITY = -0.15   # 유가 10% 상승 → LF 1.5%p 하락 (IATA 2023)
COMP_LF_PENALTY = -8.0        # 신규 경쟁사 진입 시 LF 약 8%p 하락


def _calc_impact(oil_delta: float, comp_entry: bool, price_delta: float) -> dict:
    oil_effect = oil_delta * FUEL_LF_SENSITIVITY
    comp_effect = COMP_LF_PENALTY if comp_entry else 0.0

    # 등급별 탄력성 가중평균으로 수요 변화 계산
    weighted_demand_change = sum(
        info["elasticity"] * price_delta * info["share"]
        for info in CLASS_ELASTICITY.values()
    )
    price_lf_effect = weighted_demand_change * (BASE_LF / 100)

    lf_delta = oil_effect + comp_effect + price_lf_effect
    new_lf = min(100.0, max(10.0, BASE_LF + lf_delta))
    demand_mul = new_lf / BASE_LF
    price_mul = 1 + price_delta / 100
    new_revenue = round(BASE_REVENUE * demand_mul * price_mul)
    new_demand = round(BASE_DEMAND * demand_mul)
    return {"new_lf": round(new_lf, 1), "new_revenue": new_revenue, "new_demand": new_demand}


class MockSimulationEngine(AbstractSimulationEngine):
    def run(self, fuel_change_percent: float, new_competitor_entry: bool, price_change_percent: float) -> dict:
        impact = _calc_impact(fuel_change_percent, new_competitor_entry, price_change_percent)
        rev_change_pct = round((impact["new_revenue"] - BASE_REVENUE) / BASE_REVENUE * 100, 1)
        demand_change_pct = round((impact["new_demand"] - BASE_DEMAND) / BASE_DEMAND * 100, 1)

        chart_data = []
        for i in range(8):
            prog = (i + 1) / 8
            eff_oil = fuel_change_percent * prog
            eff_comp = new_competitor_entry and i >= 2
            eff_price = price_change_percent * prog
            pt = _calc_impact(eff_oil, eff_comp, eff_price)
            # 시드 고정 의사난수로 기준선 자연스러운 변동 표현
            pseudo_rand = (math.sin(i * 1337) + 1) / 2 * 0.3 + 0.85
            baseline = round(BASE_REVENUE * pseudo_rand)
            chart_data.append({
                "month": f"{i + 1}월",
                "baseline": baseline,
                "simulation": pt["new_revenue"],
                "lf": pt["new_lf"],
            })

        return {
            "expected_demand_change": demand_change_pct,
            "expected_revenue_change": rev_change_pct,
            "optimal_price_range": {
                "min": impact["new_revenue"] * 0.9,
                "max": impact["new_revenue"] * 1.1,
            },
            "chart_data": chart_data,
        }
