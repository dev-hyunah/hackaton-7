from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.models import AiRecommendation, RecommendationStatus, ChangeType, FareTier
from app.repositories.fare_repository import FareRepository
from app.repositories.price_history_repository import PriceHistoryRepository
from app.schemas.schemas import (
    AiRecommendationSchema, ApprovalResponse, RejectionResponse,
    StrategyAnalysisSchema, ClassAdjustment, ClassContext,
)
from ai_engine.groq_ai_engine import GroqAiEngine


class AiRecommendationService:
    def __init__(self, db: Session):
        self.db = db
        self.fare_repo = FareRepository(db)
        self.history_repo = PriceHistoryRepository(db)
        self.ai_engine = GroqAiEngine()

    def get_recommendations(self, route_id: str | None = None) -> list[AiRecommendationSchema]:
        query = self.db.query(AiRecommendation)
        recs = query.order_by(AiRecommendation.created_at.desc()).all()
        result = []
        for rec in recs:
            flight = self.fare_repo.get_flight_by_id(rec.flight_id)
            result.append(
                AiRecommendationSchema(
                    recommendation_id=rec.id,
                    flight_id=rec.flight_id,
                    flight_number=flight.flight_number if flight else rec.flight_id,
                    route=flight.route_id if flight else "",
                    departure_time=flight.departure_time if flight else "",
                    class_code=rec.class_code,
                    tier="economy_full",
                    current_price=rec.current_price,
                    recommended_price=rec.recommended_price,
                    rationale=rec.rationale,
                    change_percent=rec.change_percent,
                    confidence=rec.confidence,
                    predicted_load_factor=rec.predicted_load_factor,
                    requires_manual_approval=True,
                    status=rec.status.value,
                    created_at=rec.created_at.isoformat(),
                )
            )
        return result

    def approve_recommendation(self, recommendation_id: str, approved_by: str) -> ApprovalResponse:
        rec = self.db.query(AiRecommendation).filter(AiRecommendation.id == recommendation_id).first()
        if rec is None:
            raise ValueError(f"Recommendation not found: {recommendation_id}")
        if rec.status != RecommendationStatus.PENDING:
            raise ValueError(f"Recommendation is not pending: {rec.status}")
        fare_tier = self.fare_repo.get_fare_tier(rec.flight_id, rec.class_code)
        if fare_tier:
            old_price = fare_tier.current_price
            fare_tier.current_price = rec.recommended_price
            self.fare_repo.update_fare_tier(fare_tier)
            self.history_repo.create(
                fare_tier_id=fare_tier.id,
                change_type=ChangeType.AI,
                price_before=old_price,
                price_after=rec.recommended_price,
                changed_by=approved_by,
            )
        rec.status = RecommendationStatus.APPROVED
        self.db.commit()
        return ApprovalResponse(
            recommendation_id=recommendation_id,
            status="approved",
            updated_price=rec.recommended_price,
        )

    def reject_recommendation(self, recommendation_id: str, rejected_by: str) -> RejectionResponse:
        rec = self.db.query(AiRecommendation).filter(AiRecommendation.id == recommendation_id).first()
        if rec is None:
            raise ValueError(f"Recommendation not found: {recommendation_id}")
        rec.status = RecommendationStatus.REJECTED
        self.db.commit()
        return RejectionResponse(recommendation_id=recommendation_id, status="rejected")

    def request_strategy_analysis(
        self,
        issue_text: str,
        route_id: str,
        flight_id: str,
        classes: list[ClassContext] | None = None,
        force_relevant: bool = False,
    ) -> StrategyAnalysisSchema:
        flight = self.fare_repo.get_flight_by_id(flight_id) or self.fare_repo.get_flight_by_number(flight_id)
        resolved_id = flight.id if flight else flight_id
        tiers = self.fare_repo.get_fare_tiers_by_flight(resolved_id) if flight else []
        base_price = min((t.current_price for t in tiers), default=0) if tiers else 0

        # 프론트에서 넘어온 classes 우선 사용, 없으면 DB tier에서 구성
        classes_ctx: list[dict] = []
        if classes:
            classes_ctx = [c.model_dump() for c in classes]
        elif tiers:
            classes_ctx = [
                {
                    "code": t.class_code,
                    "name": t.class_code,
                    "seats": t.total_seats,
                    "sold": t.sold_seats,
                    "price": t.current_price,
                    "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                }
                for t in tiers
            ]

        from datetime import date as _date
        today_str = _date.today().isoformat()
        departure_str = str(flight.departure_date) if flight and flight.departure_date else ""

        result = self.ai_engine.analyze_strategy(issue_text, {
            "route_id": route_id,
            "flight_id": flight_id,
            "flight_number": flight.flight_number if flight else flight_id,
            "load_factor": round(flight.load_factor) if flight else 70,
            "classes": classes_ctx,
            "departure_date": departure_str,
            "today_date": today_str,
            "force_relevant": force_relevant,
        })

        price_factor = float(result.get("price_factor", 1.0))
        recommended_price = result.get("recommended_price") or (
            round(base_price * price_factor / 1000) * 1000 if base_price else 0
        )

        # 등급별 추천 매핑
        raw_adjustments: list[dict] = result.get("class_adjustments", [])
        class_adjustments = [
            ClassAdjustment(
                code=a["code"],
                name=a["name"],
                current_price=next(
                    (c["price"] for c in classes_ctx if c["code"] == a["code"]), 0
                ),
                recommended_price=int(a["recommended_price"]),
                reason=a.get("reason", ""),
            )
            for a in raw_adjustments
        ]

        # recommended_price: class_adjustments 있으면 평균, 없으면 price_factor 기반
        if class_adjustments:
            recommended_price = round(
                sum(a.recommended_price for a in class_adjustments) / len(class_adjustments)
            )

        return StrategyAnalysisSchema(
            strategy_id=str(uuid.uuid4()),
            description=result.get("description", f'"{issue_text}" 분석 결과 — 즉각 운임 조정 권고'),
            flight_id=flight_id,
            recommended_price=int(recommended_price),
            irrelevant=bool(result.get("irrelevant", False)),
            class_adjustments=class_adjustments,
            created_at=datetime.utcnow().isoformat(),
        )
