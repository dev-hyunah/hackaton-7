"""
다이나믹 프라이싱 모듈
- 프레스티지석: Pace-Based Continuous Pricing
- 일반석: Logit WTP 구매 확률 + Hybrid Up-pricing
"""
from __future__ import annotations
import math


def logit_buy_probability(price: float, alpha: float, beta: float) -> float:
    """
    Logit 구매 확률 함수.
    P(Buy|p) = exp(alpha - beta*p) / (1 + exp(alpha - beta*p))

    :param price: 제시 가격
    :param alpha: 기본 수요 강도 (시즌·요일·경쟁사 반영)
    :param beta: 가격 민감도 (출발 임박할수록 낮아짐)
    """
    beta = max(beta, 1e-9)
    x = alpha - beta * price
    # 오버플로우 방어
    x = max(-500.0, min(500.0, x))
    e = math.exp(x)
    return e / (1.0 + e)


def prestige_dynamic_price(
    base_price: float,
    remaining: int,
    total: int = 8,
    k_factor: float = 1.0,
    theta: float = 0.25,
) -> float:
    """
    프레스티지석 Pace-Based Continuous Pricing.
    P = Base * K * (1 + theta * (1 - R/total)) * exp_boost(R)

    잔여석 4석 이하: 가격 지수적 상승 가중치 추가.
    """
    remaining = max(0, min(remaining, total))
    base_factor = 1.0 + theta * (1.0 - remaining / max(total, 1))

    # 잔여석 4석 이하: 지수 가중치 (최대 약 +80%)
    if remaining <= 4:
        exp_boost = math.exp(0.15 * (4 - remaining))
    else:
        exp_boost = 1.0

    price = base_price * k_factor * base_factor * exp_boost
    return round(price / 1000) * 1000


def economy_uppricing(
    current_q_price: float,
    q_demand: float,
    q_demand_threshold: float,
    m_price_floor: float,
) -> float:
    """
    일반석 하이브리드 제어: 특가(V) 수요 급증 시 가격 상향 조정.
    V 클래스를 즉시 차단하는 대신 M 클래스 하한선까지 Up-pricing.

    :param current_q_price: 현재 특가 운임
    :param q_demand: 현재 특가 수요(예약 속도)
    :param q_demand_threshold: 임계 수요
    :param m_price_floor: M 클래스 하한 운임
    """
    if q_demand <= q_demand_threshold:
        return current_q_price
    overflow = q_demand - q_demand_threshold
    ratio = min(overflow / max(q_demand_threshold, 1), 1.0)
    target = current_q_price + (m_price_floor - current_q_price) * ratio
    return round(target / 1000) * 1000


def recommend_prices(
    prestige_base: float,
    prestige_remaining: int,
    economy_normal_fare: float,
    economy_discount_fare: float,
    economy_special_fare: float,
    economy_normal_sold: int,
    economy_discount_sold: int,
    economy_special_sold: int,
    economy_normal_seats: int,
    economy_discount_seats: int,
    economy_special_seats: int,
    dtd: int = 30,
    search_traffic_ratio: float = 1.0,
    competitor_price: float = 0.0,
) -> dict:
    """
    통합 가격 추천 함수. EMSRb + Dynamic Pricing 결합.
    반환: 각 클래스별 추천 운임 dict
    """
    from app.core.emsr import FareClassInput, calculate_emsr_b

    total_economy = economy_normal_seats + economy_discount_seats + economy_special_seats

    # 수요 예측 (DTD·시즌·검색량 반영 단순 휴리스틱)
    demand_scale = max(0.1, search_traffic_ratio) * max(0.3, 1.0 - dtd / 180)
    mu1 = economy_normal_seats * 0.6 * demand_scale
    mu2 = economy_discount_seats * 0.5 * demand_scale
    mu3 = economy_special_seats * 0.4 * demand_scale
    sig1 = max(1.0, mu1 * 0.3)
    sig2 = max(1.0, mu2 * 0.3)
    sig3 = max(1.0, mu3 * 0.3)

    emsr = calculate_emsr_b(
        FareClassInput(economy_normal_fare, mu1, sig1),
        FareClassInput(economy_discount_fare, mu2, sig2),
        FareClassInput(economy_special_fare, mu3, sig3),
        total_seats=total_economy,
    )

    # 가격 민감도: DTD 짧을수록 낮음
    beta = max(1e-7, 0.00002 - dtd * 5e-8)
    alpha_normal = 3.0 * demand_scale
    alpha_discount = 2.0 * demand_scale
    alpha_special = 1.5 * demand_scale

    # 프레스티지 추천가
    k = max(0.8, min(1.4, 1.0 + (1.0 - dtd / 90) * 0.2))
    prestige_rec = prestige_dynamic_price(prestige_base, prestige_remaining, k_factor=k)

    # 일반석 정상(Y): EMSRb 보호 수준 반영 가격 조정
    # 보호 수준이 높을수록 상위 클래스 가격 유지/상승
    protect_ratio = min(emsr.protection_1 / max(economy_normal_seats, 1), 1.0)
    normal_adj = 1.0 + 0.15 * protect_ratio
    normal_rec = round(economy_normal_fare * normal_adj / 1000) * 1000

    # 일반석 할인(M): 구매 확률로 최적가 탐색
    best_m_price = economy_discount_fare
    best_m_rev = 0.0
    remaining_m = max(0, economy_discount_seats - economy_discount_sold)
    for adj in [-0.2, -0.1, 0.0, 0.1, 0.2]:
        p = economy_discount_fare * (1 + adj)
        prob = logit_buy_probability(p, alpha_discount, beta)
        rev = p * prob * remaining_m
        if rev > best_m_rev:
            best_m_rev = rev
            best_m_price = p
    discount_rec = round(best_m_price / 1000) * 1000

    # 일반석 특가(V): 수요 급증 시 Up-pricing
    q_demand = economy_special_sold / max(economy_special_seats, 1) * economy_special_seats
    special_rec = economy_uppricing(
        economy_special_fare,
        q_demand,
        economy_special_seats * 0.7,
        economy_discount_fare,
    )

    # 경쟁사 대비 조정 (가격 열위 시 소폭 인하)
    if competitor_price > 0:
        avg_rec = (normal_rec + discount_rec + special_rec) / 3
        if avg_rec > competitor_price * 1.15:
            discount_rec = round(discount_rec * 0.97 / 1000) * 1000
            special_rec = round(special_rec * 0.97 / 1000) * 1000

    # BR-01: 상위 클래스 운임 > 하위 클래스 운임 보장
    normal_rec = max(normal_rec, discount_rec + 5000)
    discount_rec = max(discount_rec, special_rec + 3000)

    return {
        "prestige": int(prestige_rec),
        "economy_normal": int(normal_rec),
        "economy_discount": int(discount_rec),
        "economy_special": int(special_rec),
        "emsr": {
            "protection_level_1": emsr.protection_1,
            "protection_level_12": emsr.protection_12,
            "booking_limit_normal": emsr.booking_limit_1,
            "booking_limit_discount": emsr.booking_limit_2,
            "booking_limit_special": emsr.booking_limit_3,
        },
    }
