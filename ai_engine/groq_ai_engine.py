from __future__ import annotations
import json
import logging
import os
import time
import urllib.request
import urllib.error
from ai_engine.interfaces import AbstractAiEngine
from ai_engine.mock_ai_engine import MockAiEngine, _apply_br03
from ai_engine.claude_ai_engine import _SYSTEM_PROMPT

_GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

logger = logging.getLogger("groq_ai_engine")


class GroqAiEngine(AbstractAiEngine):
    """Groq API 기반 운임 전략 분석 엔진 (무료 티어).
    GROQ_MODEL 환경변수로 모델 지정 (기본값: llama-3.3-70b-versatile).
    연결 실패 또는 API Key 미설정 시 MockAiEngine으로 자동 fallback.
    """

    def __init__(self) -> None:
        self._api_key = os.environ.get("GROQ_API_KEY", "")
        self._model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        self._mock = MockAiEngine()

    def generate_recommendation(self, flight: dict, fare: dict) -> dict:
        return self._mock.generate_recommendation(flight, fare)

    def analyze_strategy(self, issue_text: str, context: dict) -> dict:
        if not self._api_key:
            logger.warning("GROQ_API_KEY 미설정 — MockAiEngine fallback")
            return self._mock.analyze_strategy(issue_text, context)

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
                f"  [{c['code']}] {c['name']}: 현재운임 {c['price']:,}원 | "
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
            "temperature": 0.3,
            "max_tokens": 1024,
            "response_format": {"type": "json_object"},
        }).encode("utf-8")

        logger.info("=" * 60)
        logger.info("[AI 전략 분석 요청]")
        logger.info("  모델    : %s", self._model)
        logger.info("  편명    : %s  노선: %s", flight_number, route)
        logger.info("  출발일  : %s  (오늘: %s)", departure_date, today_date)
        logger.info("  탑승률  : %s%%", load_factor)
        logger.info("  이슈    : %s", issue_text)
        logger.info("[좌석 등급 현황]")
        for line in class_lines:
            logger.info("  %s", line)

        start_time = time.time()
        try:
            req = urllib.request.Request(
                _GROQ_API_URL,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self._api_key}",
                    "User-Agent": "python-urllib/3",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode("utf-8")

            elapsed = round(time.time() - start_time, 2)
            response_data = json.loads(body)
            raw = response_data["choices"][0]["message"]["content"].strip()
            usage = response_data.get("usage", {})

            logger.info("[AI 응답 수신]  소요시간: %ss  토큰: prompt=%s / completion=%s / total=%s",
                        elapsed,
                        usage.get("prompt_tokens", "-"),
                        usage.get("completion_tokens", "-"),
                        usage.get("total_tokens", "-"))

            data = json.loads(raw)
            adjustments = data.get("class_adjustments", [])
            irrelevant = bool(data.get("irrelevant", False))

            # BR-03: ±30% 클램핑
            for adj in adjustments:
                src = next((c for c in classes if c["code"] == adj["code"]), None)
                if src and src["price"] > 0:
                    original = int(adj["recommended_price"])
                    adj["recommended_price"] = _apply_br03(src["price"], original)
                    if adj["recommended_price"] != original:
                        logger.info("  BR-03 클램핑 [%s] %s원 → %s원",
                                    adj["code"], f"{original:,}", f"{adj['recommended_price']:,}")

            if irrelevant:
                logger.info("[분석 결과] 관련 없음 — %s", data.get("description", "")[:80])
            else:
                logger.info("[분석 결과] 관련 있음 — 등급별 추천가:")
                for adj in adjustments:
                    src = next((c for c in classes if c["code"] == adj["code"]), None)
                    current = src["price"] if src else 0
                    diff = adj["recommended_price"] - current
                    sign = "+" if diff >= 0 else ""
                    logger.info("  [%s] %s원 → %s원 (%s%s원)  사유: %s",
                                adj["code"],
                                f"{current:,}",
                                f"{adj['recommended_price']:,}",
                                sign, f"{diff:,}",
                                adj.get("reason", ""))
                logger.info("  전략 요약: %s", data.get("description", "")[:120])
            logger.info("=" * 60)

            return {
                "description": data.get("description", ""),
                "irrelevant": irrelevant,
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
            elapsed = round(time.time() - start_time, 2)
            logger.error("[AI 오류] %s: %s (소요: %ss) — MockAiEngine fallback",
                         type(e).__name__, e, elapsed)
            logger.info("=" * 60)
            return self._mock.analyze_strategy(issue_text, context)
