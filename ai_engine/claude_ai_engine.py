from __future__ import annotations
import os
from ai_engine.interfaces import AbstractAiEngine
from ai_engine.mock_ai_engine import MockAiEngine, _apply_br03


class ClaudeAiEngine(AbstractAiEngine):
    """AbstractAiEngine implementation that calls Claude API.
    Falls back to MockAiEngine when ANTHROPIC_API_KEY is not set.
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
            return self._mock.analyze_strategy(issue_text, context)

        route = context.get("route", "")
        flight_id = context.get("flight_id", "")

        prompt = (
            f"당신은 항공사 Revenue Management 전문가입니다.\n"
            f"노선: {route}, 항공편: {flight_id}\n"
            f"담당자 보고 이슈: \"{issue_text}\"\n\n"
            "위 이슈가 해당 노선/항공편의 수요와 운임에 미치는 영향을 분석하고, "
            "다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n"
            "{\n"
            '  "description": "분석 결과 및 운임 전략 권고 (2~3문장)",\n'
            '  "price_factor": 1.10\n'
            "}\n"
            "price_factor는 현재 운임 대비 권고 배율입니다 (예: 1.10 = 10% 인상, 0.90 = 10% 인하)."
        )

        try:
            message = self._client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            import json
            data = json.loads(raw)
            return {
                "description": data.get("description", raw),
                "price_factor": float(data.get("price_factor", 1.0)),
            }
        except Exception:
            return self._mock.analyze_strategy(issue_text, context)
