from __future__ import annotations
from sqlalchemy.orm import Session
from app.models.models import Flight, FareTier, Route


class FareRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_flights_by_route_date(self, route_id: str, departure_date) -> list[Flight]:
        return (
            self.db.query(Flight)
            .filter(Flight.route_id == route_id, Flight.departure_date == departure_date)
            .all()
        )

    def get_flight_by_id(self, flight_id: str) -> Flight | None:
        return self.db.query(Flight).filter(Flight.id == flight_id).first()

    def get_flight_by_number(self, flight_number: str) -> Flight | None:
        return (
            self.db.query(Flight)
            .filter(Flight.flight_number == flight_number)
            .order_by(Flight.departure_date.asc())
            .first()
        )

    def get_fare_tiers_by_flight(self, flight_id: str) -> list[FareTier]:
        return self.db.query(FareTier).filter(FareTier.flight_id == flight_id).all()

    def get_fare_tier(self, flight_id: str, class_code: str) -> FareTier | None:
        return (
            self.db.query(FareTier)
            .filter(FareTier.flight_id == flight_id, FareTier.class_code == class_code)
            .first()
        )

    def update_fare_tier(self, fare_tier: FareTier) -> FareTier:
        self.db.commit()
        self.db.refresh(fare_tier)
        return fare_tier

    def get_route_by_id(self, route_id: str) -> Route | None:
        return self.db.query(Route).filter(Route.id == route_id).first()

    def get_all_routes(self) -> list[Route]:
        return self.db.query(Route).all()
