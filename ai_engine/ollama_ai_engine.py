from __future__ import annotations
import json
import os
import urllib.request
import urllib.error
from ai_engine.interfaces import AbstractAiEngine
from ai_engine.mock_ai_engine import MockAiEngine, _apply_br03
from ai_engine.claude_ai_engine import _SYSTEM_PROMPT

_OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "exaone3.5:7.8b")


class OllamaAiEngine(AbstractAiEngine):
    """Ollama 로컬 LLM 기반 운임 전략 분석 엔진.
    OLLAMA_MODEL 환경변수로 모델 지정 (기본값: exaone3.5:7.8b).
    Ollama 연결 실패 시 MockAiEngine으로 자동 fallback.
    """

    def __init__(self) -> None:
        self._model = _OLLAMA_MODEL
        self._base_url = _OLLAMA_BASE_URL
        self._mock = MockAiEngine()

    def generate_recommendation(self, flight: dict, fare: dict) -> dict:
        return self._mock.generate_recommendation(flight, fare)

    def analyze_strategy(self, issue_text: str, context: dict) -> dict:
        route = context.get("route_id", "")
        flight_number = context.get("flight_number", "")
        load_factor = context.get("load_factor", 70)
        classes: list[dict] = context.get("classes", [])
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

        payload = json.dumps({
            "model": self._model,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            "stream": False,
            "format": "json",
        }).encode("utf-8")

        try:
            print(f"[OllamaAiEngine] 호출 — 모델: {self._model}, 편명: {flight_number}, 이슈: {issue_text[:40]}")
            req = urllib.request.Request(
                f"{self._base_url}/api/chat",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = resp.read().decode("utf-8")

            response_data = json.loads(body)
            raw = response_data["message"]["content"].strip()

            # 마크다운 코드블록 대응
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            print(f"[OllamaAiEngine] 응답: {raw[:200]}")
            data = json.loads(raw)
            adjustments = data.get("class_adjustments", [])

            # BR-03: ±30% 클램핑
            for adj in adjustments:
                src = next((c for c in classes if c["code"] == adj["code"]), None)
                if src and src["price"] > 0:
                    adj["recommended_price"] = _apply_br03(src["price"], int(adj["recommended_price"]))

            return {
                "description": data.get("description", ""),
                "irrelevant": bool(data.get("irrelevant", False)),
                "class_adjustments": adjustments,
                "price_factor": (
                    sum(
                        a["recommended_price"] / c["price"]
                        for a in adjustments
                        for c in classes
                        if c["code"] == a["code"] and c["price"] > 0
                    ) / len(adjustments)
                    if adjustments else 1.0
                ),
            }
        except Exception as e:
            print(f"[OllamaAiEngine] 오류 — {type(e).__name__}: {e} — MockAiEngine으로 fallback")
            return self._mock.analyze_strategy(issue_text, context)
