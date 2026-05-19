from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.ai_recommendation_service import AiRecommendationService
from app.schemas.schemas import (
    AiRecommendationSchema, ApprovalRequest, ApprovalResponse,
    RejectionRequest, RejectionResponse, StrategyAnalysisRequest, StrategyAnalysisSchema,
)

router = APIRouter(prefix="/recommendations", tags=["ai-recommendations"])


@router.get("/", response_model=list[AiRecommendationSchema])
def get_recommendations(route: Optional[str] = None, db: Session = Depends(get_db)):
    service = AiRecommendationService(db)
    return service.get_recommendations(route)


@router.post("/{recommendation_id}/approve", response_model=ApprovalResponse)
def approve_recommendation(recommendation_id: str, body: ApprovalRequest, db: Session = Depends(get_db)):
    service = AiRecommendationService(db)
    try:
        return service.approve_recommendation(recommendation_id, body.approved_by)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{recommendation_id}/reject", response_model=RejectionResponse)
def reject_recommendation(recommendation_id: str, body: RejectionRequest, db: Session = Depends(get_db)):
    service = AiRecommendationService(db)
    try:
        return service.reject_recommendation(recommendation_id, body.rejected_by)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/strategy", response_model=StrategyAnalysisSchema)
def request_strategy(body: StrategyAnalysisRequest, db: Session = Depends(get_db)):
    service = AiRecommendationService(db)
    return service.request_strategy_analysis(
        body.issue_text, body.route, body.flight_id, body.classes or [],
        force_relevant=body.force_relevant,
    )
