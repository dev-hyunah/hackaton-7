from __future__ import annotations
from datetime import date, datetime
from sqlalchemy.orm import Session

from app.repositories.fare_repository import FareRepository
from app.repositories.price_history_repository import PriceHistoryRepository
from app.models.models import ChangeType
from app.schemas.schemas import (
    FlightFareSchema, BookingClassSchema, FareUpdateResponse, PriceHistorySchema,
)


def validate_tier_prices(prestige: int, economy_full: int, economy_discount: int, economy_special: int) -> bool:
    """BR-01, BR-04, BR-08 validation pure function."""
    if any(p <= 0 for p in [prestige, economy_full, economy_discount, economy_special]):
        return False  # BR-04
    if prestige < economy_full * 1.5:
        return False  # BR-08
    if not (economy_full > economy_discount > economy_special):
        return False  # BR-01
    return True


class FareService:
    def __init__(self, db: Session):
        self.fare_repo = FareRepository(db)
        self.history_repo = PriceHistoryRepository(db)

    def get_fares_by_route_date(self, route_id: str, query_date: date) -> list[FlightFareSchema]:
        flights = self.fare_repo.get_flights_by_route_date(route_id, query_date)
        result = []
        for flight in flights:
            tiers = self.fare_repo.get_fare_tiers_by_flight(flight.id)
            classes = [
                BookingClassSchema(
                    class_code=t.class_code,
                    tier=t.tier.value,
                    status=t.status,
                    current_price=t.current_price,
                    ai_recommended_price=t.ai_recommended_price,
                    sold_seats=t.sold_seats,
                    total_seats=t.total_seats,
                )
                for t in tiers
            ]
            current_price = min((t.current_price for t in tiers), default=0)
            ai_price = min(
                (t.ai_recommended_price for t in tiers if t.ai_recommended_price),
                default=None,
            )
            result.append(
                FlightFareSchema(
                    flight_id=flight.id,
                    flight_number=flight.flight_number,
                    route=route_id,
                    departure_time=flight.departure_time,
                    time_slot=flight.time_slot,
                    load_factor=flight.load_factor,
                    pace=flight.pace,
                    current_price=current_price,
                    ai_recommended_price=ai_price,
                    status="stable",
                    classes=classes,
                    base_cost=flight.base_cost,
                    analysis_reason="",
                )
            )
        return result

    def _resolve_flight_id(self, flight_id: str) -> str:
        """UUID가 아닌 편명(KE1211 등)으로 조회된 경우 실제 DB flight.id로 변환."""
        flight = self.fare_repo.get_flight_by_id(flight_id)
        if flight:
            return flight_id
        flight = self.fare_repo.get_flight_by_number(flight_id)
        if flight:
            return flight.id
        return flight_id

    def update_fare(self, flight_id: str, class_code: str, new_price: int, updated_by: str) -> FareUpdateResponse:
        resolved_id = self._resolve_flight_id(flight_id)
        fare_tier = self.fare_repo.get_fare_tier(resolved_id, class_code)
        if fare_tier is None:
            raise ValueError(f"FareTier not found: {flight_id}/{class_code}")
        old_price = fare_tier.current_price
        fare_tier.current_price = new_price
        self.fare_repo.update_fare_tier(fare_tier)
        self.history_repo.create(
            fare_tier_id=fare_tier.id,
            change_type=ChangeType.MANUAL,
            price_before=old_price,
            price_after=new_price,
            changed_by=updated_by,
        )
        return FareUpdateResponse(
            flight_id=resolved_id,
            class_code=class_code,
            old_price=old_price,
            new_price=new_price,
            updated_at=datetime.utcnow().isoformat(),
        )

    def get_price_history(self, flight_id: str) -> list[PriceHistorySchema]:
        tiers = self.fare_repo.get_fare_tiers_by_flight(flight_id)
        history = []
        for tier in tiers:
            for h in self.history_repo.get_by_fare_tier(tier.id):
                history.append(
                    PriceHistorySchema(
                        id=h.id,
                        fare_tier_id=h.fare_tier_id,
                        class_code=tier.class_code,
                        change_type=h.change_type.value,
                        price_before=h.price_before,
                        price_after=h.price_after,
                        changed_by=h.changed_by,
                        changed_at=h.changed_at.isoformat(),
                    )
                )
        history.sort(key=lambda x: x.changed_at, reverse=True)
        return history
