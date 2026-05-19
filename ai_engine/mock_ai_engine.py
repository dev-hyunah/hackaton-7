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
        keywords_surge = ["행사", "콘서트", "축제", "연휴", "명절", "공휴일", "황금연휴"]
        keywords_drop  = ["태풍", "결항", "취소", "사고", "재난", "침수", "폭설"]
        lf = context.get("load_factor", 70)
        route = context.get("route_id", "해당 노선")
        flight_no = context.get("flight_number", "")
        flight_ref = f"{flight_no} ({route})" if flight_no else route
        classes: list[dict] = context.get("classes", [])
        departure_date: str = context.get("departure_date", "")
        today_date: str = context.get("today_date", "")

        # ── 관련성 판단 ──────────────────────────────────────────────────────
        # 1) 노선 지역 키워드 매핑
        region_map = {
            "제주": ["CJU"],
            "부산": ["PUS"],
            "대구": ["TAE"],
            "광주": ["KWJ", "KUV"],
            "청주": ["CJJ"],
            "여수": ["RSU"],
            "포항": ["KPO"],
            "울산": ["USN"],
            "서울": ["GMP", "ICN"],
            "인천": ["ICN"],
            "김포": ["GMP"],
        }
        # 이슈 텍스트에서 언급된 지역의 IATA 코드 추출
        mentioned_iatas: list[str] = []
        for region, iatas in region_map.items():
            if region in issue_text:
                mentioned_iatas.extend(iatas)

        # 노선에 포함된 IATA 코드
        route_iatas = route.replace("-", "/").replace("_", "/").split("/") if route else []

        # 2) 날짜 관련성 — "N일 후", "내일", "다음주" 등 미래 시점 감지
        import re as _re
        days_ahead = None
        m = _re.search(r"(\d+)\s*일\s*(후|뒤|째|이후)", issue_text)
        if m:
            days_ahead = int(m.group(1))
        elif "내일" in issue_text:
            days_ahead = 1
        elif "모레" in issue_text:
            days_ahead = 2
        elif "다음\s*주" in issue_text or "다음주" in issue_text:
            days_ahead = 7

        # 날짜 불일치 체크 (출발일과 today_date 모두 있을 때)
        date_mismatch = False
        if days_ahead is not None and departure_date and today_date:
            try:
                from datetime import date as _date, timedelta
                dep = _date.fromisoformat(departure_date)
                today = _date.fromisoformat(today_date)
                issue_date = today + timedelta(days=days_ahead)
                # 이슈 날짜와 출발일이 다르면 무관
                date_mismatch = dep != issue_date
            except Exception:
                pass

        # 3) 지역 불일치 체크
        region_mismatch = bool(mentioned_iatas) and not any(
            iata in route_iatas for iata in mentioned_iatas
        )

        force_relevant = context.get("force_relevant", False)
        if (date_mismatch or region_mismatch) and not force_relevant:
            reasons = []
            if date_mismatch:
                reasons.append(f"이슈 예상 날짜({days_ahead}일 후)와 항공편 출발일({departure_date})이 다릅니다")
            if region_mismatch:
                regions_in_issue = [r for r in region_map if r in issue_text]
                reasons.append(f"이슈 지역({', '.join(regions_in_issue)})이 현재 노선({route})과 무관합니다")
            return {
                "irrelevant": True,
                "description": (
                    f"[{flight_ref}] 해당 이슈는 현재 항공편과 직접적인 관련이 없습니다. "
                    + " / ".join(reasons) + ". 운임 조정이 필요하지 않습니다."
                ),
                "price_factor": 1.0,
                "class_adjustments": [],
            }

        if any(k in issue_text for k in keywords_surge):
            factor_map = {"C": 1.18, "Y": 1.15, "M": 1.10, "V": 1.05}
            desc = (
                f'[{flight_ref}] "{issue_text}" 요인으로 단기 수요 급증이 예상됩니다 (현재 L/F {lf}%). '
                f"프레스티지·일반석 정상 운임을 즉시 인상하고 특가 클래스 인벤토리 회수를 권고합니다. "
                f"경쟁사 동일 노선 동향을 실시간 모니터링하며 단계적으로 운임을 조정하십시오."
            )
            price_factor = 1.15
        elif any(k in issue_text for k in keywords_drop):
            factor_map = {"C": 0.97, "Y": 0.93, "M": 0.90, "V": 0.87}
            desc = (
                f'[{flight_ref}] "{issue_text}" 요인으로 수요 위축이 우려됩니다 (현재 L/F {lf}%). '
                f"일반석 할인·특가 운임을 인하하여 가격 민감 고객층 유입을 유도하십시오. "
                f"프레스티지 클래스는 현행 수준을 유지하여 수익성 하한선을 방어하시기 바랍니다."
            )
            price_factor = 0.92
        elif lf >= 75:
            factor_map = {"C": 1.12, "Y": 1.10, "M": 1.06, "V": 1.0}
            desc = (
                f'[{flight_ref}] "{issue_text}" 분석 완료 — 예약 페이스가 목표 대비 양호합니다 (L/F {lf}%). '
                f"상위 등급(C·Y) 운임을 소폭 인상하고 M 클래스 오픈 좌석을 선제적으로 축소하여 단가를 방어하십시오. "
                f"특가(V) 클래스는 현행 유지 또는 Closed 전환을 검토하십시오."
            )
            price_factor = 1.08
        elif lf <= 55:
            factor_map = {"C": 1.0, "Y": 0.97, "M": 0.93, "V": 0.90}
            desc = (
                f'[{flight_ref}] "{issue_text}" 분석 완료 — 예약 유입이 기준치 대비 저조합니다 (L/F {lf}%). '
                f"일반석 특가·할인 운임을 인하하여 조기 예약을 촉진하십시오. "
                f"프레스티지는 현행 운임을 유지하되 경쟁사 가격 포지셔닝을 재점검하십시오."
            )
            price_factor = 0.95
        else:
            factor_map = {"C": 1.03, "Y": 1.02, "M": 1.0, "V": 0.98}
            desc = (
                f'[{flight_ref}] "{issue_text}" 분석 완료 — 수요 흐름은 안정 구간입니다 (L/F {lf}%). '
                f"현행 운임 체계를 유지하되, 상위 등급을 미세 인상하여 yield를 소폭 개선할 수 있습니다. "
                f"48시간 이내 L/F 변동 추이를 재확인하여 탄력적 조정 시점을 검토하십시오."
            )
            price_factor = 1.02

        # 등급별 추천가 계산 (BR-03 적용)
        adjustments = []
        for c in classes:
            f = factor_map.get(c["code"], price_factor)
            suggested = round(c["price"] * f / 1000) * 1000
            clamped = _apply_br03(c["price"], suggested)
            reasons = {
                "C": "프레스티지 수요 탄력성 낮음 — 인상 여력 최대",
                "Y": "정상석 수요 변동 반영",
                "M": "할인석 가격 포지셔닝 조정",
                "V": "특가석 조기 예약 촉진 또는 수익 보호",
            }
            adjustments.append({
                "code": c["code"],
                "name": c["name"],
                "recommended_price": clamped,
                "reason": reasons.get(c["code"], "시장 상황 반영"),
            })

        return {
            "description": desc,
            "price_factor": price_factor,
            "class_adjustments": adjustments,
        }
