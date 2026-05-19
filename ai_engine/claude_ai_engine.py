from __future__ import annotations
import json
import os
from ai_engine.interfaces import AbstractAiEngine
from ai_engine.mock_ai_engine import MockAiEngine, _apply_br03

_SYSTEM_PROMPT = """\
당신은 대한항공 Revenue Management 시스템의 AI 운임 전략 분석가입니다.
담당자가 입력한 자연어 이슈를 분석하여 항공편 좌석 등급별 최적 운임을 추천합니다.

## Step 1 — 관련성 판단 (필수)
이슈가 현재 분석 대상 항공편에 실제로 영향을 미치는지 먼저 판단하세요.

관련성 기준:
- **날짜**: 이슈가 발생하는 날짜/기간이 해당 항공편 출발일을 포함하는가?
  예) "5일 후 태풍" → 오늘 출발 편은 무관, 5일 후 출발 편은 관련
- **지역/노선**: 이슈 발생 지역이 출발지 또는 도착지와 연관되는가?
  예) "제주도 태풍" → GMP-CJU 노선은 관련, GMP-TAE 노선은 무관
  예) "부산 행사" → GMP-PUS, ICN-PUS 관련, GMP-CJU 무관
- **수요 영향**: 이슈가 해당 편의 예약·탑승 수요에 실질적 영향을 주는가?

**관련 없음(irrelevant)** 판정 조건 — 아래 중 하나라도 해당하면 irrelevant:
- 이슈 날짜가 해당 항공편 출발일과 다름
- 이슈 지역이 해당 노선 출발지·도착지와 무관
- 이슈가 수요에 영향을 주지 않는 일반 뉴스

## Step 2 — 운임 조정 (관련 있을 때만)
관련성이 있다고 판단된 경우에만 등급별 운임을 추천하세요.

조정 원칙:
- 수요 급증 이슈: 상위 등급 인상폭 크게, 하위 특가 Closed 권고 가능
- 수요 위축 이슈: 하위 등급 인하로 수요 유입, 상위 등급 유지 또는 소폭 인하
- BR-03: 추천가는 현재 운임 대비 ±30% 이내
- Closed 등급도 추천 운임 제시 (전환 여부는 사용자 결정)

## 출력 형식
반드시 아래 JSON만 출력하고 다른 텍스트는 절대 포함하지 마세요.

**관련 없는 경우** (`irrelevant: true`):
{
  "irrelevant": true,
  "description": "이슈와 해당 항공편의 관련성이 없는 이유를 1~2문장으로 설명 (한국어)",
  "class_adjustments": []
}

**관련 있는 경우** (`irrelevant: false`):
{
  "irrelevant": false,
  "description": "분석 요약 및 전략 방향 (3~4문장, 한국어, 구체적 수치 포함)",
  "class_adjustments": [
    {"code": "C", "name": "프레스티지",    "recommended_price": 230000, "reason": "조정 이유 1문장"},
    {"code": "Y", "name": "일반석 정상",   "recommended_price": 135000, "reason": "..."},
    {"code": "M", "name": "일반석 할인",   "recommended_price": 98000,  "reason": "..."},
    {"code": "V", "name": "일반석 특가",   "recommended_price": 72000,  "reason": "..."}
  ]
}
"""


class ClaudeAiEngine(AbstractAiEngine):
    """Claude API 기반 운임 전략 분석 엔진.
    ANTHROPIC_API_KEY 미설정 시 MockAiEngine으로 자동 fallback.
    """

    def __init__(self) -> None:
        self._api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        self._mock = MockAiEngine()
        if self._api_key:
            import anthropic
            self._client = anthropic.Anthropic(api_key=self._api_key)
        else:
            self._client = None

    def generate_recommendation(self, flight: dict, fare: dict) -> dict:
        return self._mock.generate_recommendation(flight, fare)

    def analyze_strategy(self, issue_text: str, context: dict) -> dict:
        if not self._client:
            print("[ClaudeAiEngine] ANTHROPIC_API_KEY not set — using MockAiEngine fallback")
            return self._mock.analyze_strategy(issue_text, context)

        if context.get("force_relevant"):
            return self._mock.analyze_strategy(issue_text, context)

        route = context.get("route_id", "")
        flight_number = context.get("flight_number", "")
        load_factor = context.get("load_factor", 70)
        classes: list[dict] = context.get("classes", [])

        # 등급별 현황 텍스트 구성
        departure_date = context.get("departure_date", "")
        today_date = context.get("today_date", "")

        class_lines = []
        for c in classes:
            lf_cls = round(c["sold"] / c["seats"] * 100) if c["seats"] > 0 else 0
            class_lines.append(
                f"  - [{c['code']}] {c['name']}: 현재운임 {c['price']:,}원 | "
                f"판매 {c['sold']}/{c['seats']}석 (L/F {lf_cls}%) | 상태: {c['status']}"
            )
        class_text = "\n".join(class_lines) if class_lines else "  (등급 정보 없음)"

        date_line = ""
        if departure_date:
            date_line = f"- 항공편 출발일: {departure_date}\n"
        if today_date:
            date_line += f"- 오늘 날짜: {today_date}\n"

        user_message = (
            f"## 분석 대상 항공편\n"
            f"- 노선: {route}\n"
            f"- 편명: {flight_number}\n"
            f"{date_line}"
            f"- 전체 탑승률(L/F): {load_factor}%\n\n"
            f"## 좌석 등급별 현황\n{class_text}\n\n"
            f"## 담당자 보고 이슈\n\"{issue_text}\"\n\n"
            "Step 1에서 이슈와 항공편의 날짜·노선 관련성을 먼저 판단한 뒤, "
            "관련 있을 때만 Step 2에서 등급별 운임을 추천하세요."
        )

        try:
            print(f"[ClaudeAiEngine] API 호출 — {flight_number} ({route}), L/F {load_factor}%, 이슈: {issue_text[:40]}")
            message = self._client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            raw = message.content[0].text.strip()
            # JSON 블록 추출 (마크다운 코드블록 대응)
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            print(f"[ClaudeAiEngine] 응답: {raw[:200]}")
            data = json.loads(raw)
            adjustments = data.get("class_adjustments", [])
            # BR-03: ±30% 클램핑 적용 (관련 있는 경우에만 의미 있음)
            for adj in adjustments:
                src = next((c for c in classes if c["code"] == adj["code"]), None)
                if src and src["price"] > 0:
                    adj["recommended_price"] = _apply_br03(src["price"], int(adj["recommended_price"]))
            return {
                "description": data.get("description", ""),
                "irrelevant": bool(data.get("irrelevant", False)),
                "class_adjustments": adjustments,
                "price_factor": (
                    sum(a["recommended_price"] / c["price"]
                        for a in adjustments
                        for c in classes if c["code"] == a["code"] and c["price"] > 0)
                    / len(adjustments) if adjustments else 1.0
                ),
            }
        except Exception as e:
            print(f"[ClaudeAiEngine] 오류 — {type(e).__name__}: {e} — MockAiEngine으로 fallback")
            return self._mock.analyze_strategy(issue_text, context)
