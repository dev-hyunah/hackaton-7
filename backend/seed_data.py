"""Seed database with real KE domestic schedule data for 9 routes × 90 days."""
import sys
import os
import uuid
import random
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models.models import Base, Route, Flight, FareTier, TierCode, AiRecommendation, RecommendationStatus, CompetitorPrice

Base.metadata.create_all(bind=engine)

ROUTES = [
    ("GMP-CJU", "GMP", "CJU"),
    ("GMP-PUS", "GMP", "PUS"),
    ("GMP-CJJ", "GMP", "CJJ"),
    ("GMP-TAE", "GMP", "TAE"),
    ("GMP-KWJ", "GMP", "KWJ"),
    ("ICN-CJU", "ICN", "CJU"),
    ("ICN-PUS", "ICN", "PUS"),
    ("GMP-KPO", "GMP", "KPO"),
    ("GMP-RSU", "GMP", "RSU"),
]

ROUTE_BASE_PRICE = {
    "GMP-CJU": 98_000, "ICN-CJU": 105_000, "GMP-PUS": 82_000,
    "GMP-CJJ": 78_000, "GMP-TAE": 75_000,  "GMP-KWJ": 70_000,
    "ICN-PUS": 80_000, "GMP-KPO": 72_000,  "GMP-RSU": 68_000,
}

# Aircraft seat config: (C, Y, M, V, total)
AIRCRAFT_CONFIG = {
    "B737-900ER": {"C": 8,  "Y": 35, "M": 95, "V": 62, "total": 200},
    "B737-800":   {"C": 8,  "Y": 28, "M": 76, "V": 46, "total": 158},
    "A220-300":   {"C": 4,  "Y": 22, "M": 62, "V": 42, "total": 130},
}

# Real KE domestic schedule per route: (flight_number, departure_time, time_slot, aircraft)
ROUTE_SCHEDULES = {
    "GMP-CJU": [
        ("KE1201", "06:30", "morning",   "B737-900ER"),
        ("KE1203", "07:30", "morning",   "B737-800"),
        ("KE1205", "08:30", "morning",   "B737-900ER"),
        ("KE1207", "09:30", "forenoon",  "B737-800"),
        ("KE1209", "10:35", "forenoon",  "A220-300"),
        ("KE1211", "11:40", "forenoon",  "B737-800"),
        ("KE1213", "12:50", "afternoon", "B737-900ER"),
        ("KE1215", "14:00", "afternoon", "B737-800"),
        ("KE1217", "15:10", "afternoon", "A220-300"),
        ("KE1219", "16:20", "afternoon", "B737-800"),
        ("KE1221", "17:30", "evening",   "B737-900ER"),
        ("KE1223", "18:40", "evening",   "B737-800"),
        ("KE1225", "19:50", "evening",   "B737-900ER"),
        ("KE1227", "21:00", "evening",   "B737-800"),
    ],
    "GMP-PUS": [
        ("KE1401", "07:00", "morning",   "B737-800"),
        ("KE1403", "09:10", "forenoon",  "B737-800"),
        ("KE1405", "12:20", "afternoon", "B737-800"),
        ("KE1407", "15:30", "afternoon", "B737-800"),
        ("KE1409", "18:40", "evening",   "B737-800"),
        ("KE1411", "21:00", "evening",   "B737-800"),
    ],
    "GMP-CJJ": [
        ("KE1501", "07:40", "morning",   "B737-800"),
        ("KE1503", "11:00", "forenoon",  "B737-800"),
        ("KE1505", "14:30", "afternoon", "B737-800"),
        ("KE1507", "18:20", "evening",   "B737-800"),
    ],
    "GMP-TAE": [
        ("KE1601", "07:50", "morning",   "B737-800"),
        ("KE1603", "11:30", "forenoon",  "B737-800"),
        ("KE1605", "15:00", "afternoon", "B737-800"),
        ("KE1607", "19:10", "evening",   "B737-800"),
    ],
    "GMP-KWJ": [
        ("KE1701", "08:10", "morning",   "B737-800"),
        ("KE1703", "12:40", "afternoon", "B737-800"),
        ("KE1705", "17:50", "evening",   "B737-800"),
    ],
    "ICN-CJU": [
        ("KE1801", "08:00", "morning",   "B737-900ER"),
        ("KE1803", "10:30", "forenoon",  "B737-900ER"),
        ("KE1805", "13:00", "afternoon", "B737-900ER"),
        ("KE1807", "16:00", "afternoon", "B737-900ER"),
        ("KE1809", "19:30", "evening",   "B737-900ER"),
    ],
    "ICN-PUS": [
        ("KE1901", "07:30", "morning",   "B737-800"),
        ("KE1903", "12:00", "afternoon", "B737-800"),
        ("KE1905", "18:30", "evening",   "B737-800"),
    ],
    "GMP-KPO": [
        ("KE2001", "08:20", "morning",   "B737-800"),
        ("KE2003", "13:10", "afternoon", "B737-800"),
        ("KE2005", "18:00", "evening",   "B737-800"),
    ],
    "GMP-RSU": [
        ("KE2101", "09:00", "forenoon",  "B737-800"),
        ("KE2103", "14:20", "afternoon", "B737-800"),
        ("KE2105", "19:40", "evening",   "B737-800"),
    ],
}

TIER_CODE_MAP = {
    "C": TierCode.PRESTIGE,
    "Y": TierCode.ECONOMY_FULL,
    "M": TierCode.ECONOMY_DISCOUNT,
    "V": TierCode.ECONOMY_SPECIAL,
}

TIER_PRICE_MULT = {
    "C": 1.95,
    "Y": 1.20,
    "M": 0.95,
    "V": 0.68,
}

COMPETITORS = ["아시아나항공", "제주항공", "진에어"]
COMPETITOR_BOOKING_CLASSES = ["Y", "M", "V"]

PEAK_MONTHS = {1, 7, 8, 12}
PEAK_DAYS = {5, 6}  # Saturday=5, Sunday=6 (isoweekday: Mon=1)


def random_lf(base: float, variance: float = 0.2) -> float:
    return min(1.0, max(0.1, base + random.uniform(-variance, variance)))


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Route).first()
        if existing:
            print("Database already seeded. Skipping.")
            return

        print("Seeding routes...")
        for route_id, origin, dest in ROUTES:
            db.add(Route(id=route_id, origin=origin, destination=dest))
        db.commit()

        start_date = date(2026, 5, 1)
        flight_count = 0
        tier_count = 0

        print("Seeding flights and fare tiers...")
        for route_id, _, _ in ROUTES:
            base_price = ROUTE_BASE_PRICE[route_id]
            schedules = ROUTE_SCHEDULES[route_id]

            for day_offset in range(90):
                dep_date = start_date + timedelta(days=day_offset)
                is_peak = dep_date.month in PEAK_MONTHS or dep_date.isoweekday() in PEAK_DAYS
                lf_base = 0.75 if is_peak else 0.55
                time_mult_peak = 1.10 if is_peak else 1.0

                for flight_no, dep_time, time_slot, aircraft in schedules:
                    flight_id = str(uuid.uuid4())[:8]
                    time_mult = 1.15 if time_slot == "evening" else 1.0 if time_slot == "morning" else 0.95
                    lf_boost = 0.08 if time_slot in ("morning", "evening") else 0.0
                    lf = random_lf(lf_base + lf_boost)

                    cfg = AIRCRAFT_CONFIG[aircraft]
                    # baseCost scales with aircraft size
                    size_mult = 1.10 if aircraft == "B737-900ER" else 0.88 if aircraft == "A220-300" else 1.0
                    base_cost = round(base_price * cfg["total"] * 0.85 * size_mult * (1 + day_offset * 0.001))

                    db.add(Flight(
                        id=flight_id,
                        route_id=route_id,
                        flight_number=flight_no,
                        departure_date=dep_date,
                        departure_time=dep_time,
                        time_slot=time_slot,
                        load_factor=round(lf * 100, 1),
                        pace=round(random.uniform(-8, 15), 1),
                        base_cost=base_cost,
                    ))
                    flight_count += 1

                    for class_code in ["C", "Y", "M", "V"]:
                        total_seats = cfg[class_code]
                        price = round(base_price * TIER_PRICE_MULT[class_code] * time_mult * time_mult_peak / 1000) * 1000

                        sold = round(total_seats * lf * random.uniform(0.8, 1.1))
                        sold = min(sold, total_seats)

                        tier = TIER_CODE_MAP[class_code]
                        status = (
                            "sold_out" if sold >= total_seats
                            else "closed" if lf > 0.9 and tier == TierCode.ECONOMY_SPECIAL
                            else "open"
                        )

                        ai_price = None
                        if lf > 0.80 and random.random() > 0.6:
                            ai_price = round(price * random.uniform(1.05, 1.20) / 1000) * 1000
                        elif lf < 0.50 and random.random() > 0.6:
                            ai_price = round(price * random.uniform(0.82, 0.95) / 1000) * 1000

                        db.add(FareTier(
                            id=str(uuid.uuid4())[:12],
                            flight_id=flight_id,
                            class_code=class_code,
                            tier=tier,
                            current_price=price,
                            ai_recommended_price=ai_price,
                            total_seats=total_seats,
                            sold_seats=sold,
                            status=status,
                        ))
                        tier_count += 1

        db.commit()

        print("Seeding competitor prices...")
        comp_count = 0
        for route_id, _, _ in ROUTES:
            base_price = ROUTE_BASE_PRICE[route_id]
            for airline in COMPETITORS:
                for day_offset in range(90):
                    obs_date = start_date + timedelta(days=day_offset)
                    for cls in COMPETITOR_BOOKING_CLASSES:
                        if cls == "Y":
                            fare = round(base_price * random.uniform(0.90, 1.10) / 1000) * 1000
                        elif cls == "M":
                            fare = round(base_price * random.uniform(0.72, 0.88) / 1000) * 1000
                        else:
                            fare = round(base_price * random.uniform(0.48, 0.62) / 1000) * 1000
                        db.add(CompetitorPrice(
                            id=str(uuid.uuid4())[:12],
                            route_id=route_id,
                            airline=airline,
                            booking_class=cls,
                            fare=fare,
                            observed_date=obs_date,
                        ))
                        comp_count += 1

        db.commit()

        print("Seeding AI recommendations...")
        db.add(AiRecommendation(
            id="REC001",
            flight_id="",
            class_code="Y",
            current_price=98_000,
            recommended_price=113_000,
            rationale="출발 5일 전 저조한 탑승률(54%). 수요 탄력성 분석 결과 가격 인하 시 LF 75% 달성 예상.",
            change_percent=15.3,
            confidence=87.0,
            predicted_load_factor=75.0,
            status=RecommendationStatus.PENDING,
        ))
        db.commit()

        print(f"Seeding complete: {flight_count} flights, {tier_count} fare tiers, {comp_count} competitor prices.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
