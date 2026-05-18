import math
from ai_engine.interfaces import AbstractAiEngine

# BR-03: AI recommended price must stay within ±30% of current price
MAX_CHANGE_PCT = 0.30


def _apply_br03(current_price: int, suggested_price: int) -> int:
    lower = math.floor(current_price * (1 - MAX_CHANGE_PCT))
    upper = math.ceil(current_price * (1 + MAX_CHANGE_PCT))
    return max(lower, min(upper, suggested_price))


class MockAiEngine(AbstractAiEngine):
    def generate_recommendation(self, flight: dict, fare: dict) -> dict:
        load_factor = flight.get("load_factor", 70)
        current_price = fare.get("current_price", 100_000)
        if load_factor >= 85:
            suggested = round(current_price * 1.15 / 1000) * 1000
            rationale = f"높은 탑승률({load_factor}%). 가격 인상 여력 있음."
            confidence = 88
            predicted_lf = min(95, load_factor + 3)
        elif load_factor <= 50:
            suggested = round(current_price * 0.88 / 1000) * 1000
            rationale = f"낮은 탑승률({load_factor}%). 가격 인하로 수요 촉진 필요."
            confidence = 75
            predicted_lf = min(70, load_factor + 15)
        else:
            suggested = current_price
            rationale = "현재 탑승률 안정적. 현행 운임 유지 권고."
            confidence = 80
            predicted_lf = load_factor
        clamped = _apply_br03(current_price, suggested)
        return {
            "recommended_price": clamped,
            "rationale": rationale,
            "confidence": confidence,
            "predicted_load_factor": predicted_lf,
        }

    def analyze_strategy(self, issue_text: str, context: dict) -> dict:
        keywords_high = ["태풍", "결항", "취소", "사고"]
        keywords_surge = ["행사", "콘서트", "축제", "연휴", "명절"]
        lf = context.get("load_factor", 70)
        route = context.get("route_id", "해당 노선")
        flight_no = context.get("flight_number", "")
        flight_ref = f"{flight_no} ({route})" if flight_no else route

        if any(k in issue_text for k in keywords_surge):
            desc = (
                f'[{flight_ref}] "{issue_text}" 요인 감지 — 단기 수요 급증 신호 확인.'
                f" 현재 L/F {lf}% 기준 상위 운임(프레스티지, 일반석 정상) 인벤토리 즉시 회수를 권고합니다."
                f" 운임 탄력성 분석 결과, {round((1.20 - 1) * 100)}% 이상 인상 시에도 수요 이탈 가능성은 낮은 것으로 평가됩니다."
                f" 경쟁사 동일 노선 운임 동향을 실시간 모니터링하며 단계적 인상을 적용하십시오."
            )
            price_factor = 1.20
        elif any(k in issue_text for k in keywords_high):
            desc = (
                f'[{flight_ref}] "{issue_text}" 요인 감지 — 수요 위축 가능성 경보.'
                f" 현재 L/F {lf}%에서 추가 하락이 예상됩니다."
                f" 하위 운임(일반석 특가, 일반석 할인) 공급 확대 및 운임 {round((1 - 0.90) * 100)}% 인하를 통해 가격 민감 고객층 유입을 유도하십시오."
                f" 단, 프레스티지 클래스는 현행 운임을 유지하여 수익성 하한선을 방어하시기 바랍니다."
            )
            price_factor = 0.90
        else:
            if lf >= 75:
                trend = f"예약 페이스가 목표치를 상회(L/F {lf}%)하고 있으며, 상위 클래스 잔여 인벤토리 축소 추세가 확인됩니다."
                action = "상위 운임(프레스티지, 일반석 정상)을 소폭 인상하고, M 클래스 오픈 좌석을 선제적으로 축소하여 단가 방어를 권고합니다."
                price_factor = 1.08
            elif lf <= 55:
                trend = f"예약 유입 속도가 계절적 기준치 대비 저조(L/F {lf}%)하며, 출발 임박 할인 수요 의존도가 높아질 위험이 있습니다."
                action = "일반석 특가 운임을 전략적으로 인하하여 조기 예약을 촉진하고, 경쟁사 대비 가격 포지셔닝을 재점검하십시오."
                price_factor = 0.95
            else:
                trend = f"현재 L/F {lf}%로 수요 흐름은 안정 구간에 있으나, 출발일까지의 잔여 기간 대비 예약 속도에 주의가 필요합니다."
                action = "현행 운임 체계를 유지하되, 48시간 이내 L/F 변동 추이를 재확인하여 탄력적 조정 시점을 검토하십시오."
                price_factor = 1.03
            desc = f'[{flight_ref}] "{issue_text}" 분석 완료 — {trend}' f" {action}"
        return {"description": desc, "price_factor": price_factor}
