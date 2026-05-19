"""
EMSRb (Expected Marginal Seat Revenue - b) 알고리즘
일반석 165석에 대한 클래스별 예약 제한량(Booking Limits) 산정
"""
from __future__ import annotations
import math
from dataclasses import dataclass

try:
    from scipy.stats import norm as _norm
    def _ppf(p: float) -> float:
        return float(_norm.ppf(p))
except ImportError:
    # scipy 미설치 시 수치 근사 (Beasley-Springer-Moro)
    def _ppf(p: float) -> float:
        if p <= 0 or p >= 1:
            return 0.0
        p = max(1e-10, min(1 - 1e-10, p))
        c = [2.515517, 0.802853, 0.010328]
        d = [1.432788, 0.189269, 0.001308]
        t = math.sqrt(-2.0 * math.log(min(p, 1 - p)))
        x = t - (c[0] + c[1] * t + c[2] * t ** 2) / (1 + d[0] * t + d[1] * t ** 2 + d[2] * t ** 3)
        return -x if p < 0.5 else x


@dataclass
class FareClassInput:
    """요금 클래스 입력 데이터"""
    fare: float       # 평균 운임
    mu: float         # 잔여 수요 평균
    sigma: float      # 잔여 수요 표준편차


@dataclass
class EMSRbResult:
    """EMSRb 계산 결과"""
    protection_1: float        # Class1 보호 수준 (s1)
    protection_12: float       # Class1+2 공동 보호 수준 (s2)
    booking_limit_1: int       # BL1 (정상 최대 예약 가능)
    booking_limit_2: int       # BL2 (할인 최대 예약 가능)
    booking_limit_3: int       # BL3 (특가 최대 예약 가능)
    total_seats: int


def calculate_emsr_b(
    cls1: FareClassInput,   # 정상 (Y)
    cls2: FareClassInput,   # 할인 (M)
    cls3: FareClassInput,   # 특가 (V)
    total_seats: int = 165,
) -> EMSRbResult:
    """
    EMSRb 알고리즘으로 일반석 예약 제한량 산정.

    수식:
      s1 = mu1 + sigma1 * Phi^-1(1 - F2/F1)
      s2 = mu_12 + sigma_12 * Phi^-1(1 - F3 / F_bar_12)
      BL1 = C, BL2 = max(0, C - s1), BL3 = max(0, C - s2)
    """
    # 분모 0 방어
    f1 = max(cls1.fare, 1.0)
    f2 = max(cls2.fare, 1.0)
    f3 = max(cls3.fare, 1.0)

    # Class1 보호 수준
    ratio1 = f2 / f1
    ratio1 = max(1e-6, min(1 - 1e-6, ratio1))
    s1 = cls1.mu + max(cls1.sigma, 0.0) * _ppf(1.0 - ratio1)
    s1 = max(0.0, s1)

    # Class1+2 공동 보호 수준
    mu_12 = cls1.mu + cls2.mu
    sigma_12 = math.sqrt(cls1.sigma ** 2 + cls2.sigma ** 2) if (cls1.sigma ** 2 + cls2.sigma ** 2) > 0 else 1e-6
    denom = mu_12 if mu_12 > 0 else 1.0
    f_bar_12 = (f1 * cls1.mu + f2 * cls2.mu) / denom
    f_bar_12 = max(f_bar_12, 1.0)

    ratio2 = f3 / f_bar_12
    ratio2 = max(1e-6, min(1 - 1e-6, ratio2))
    s2 = mu_12 + sigma_12 * _ppf(1.0 - ratio2)
    s2 = max(0.0, s2)

    bl1 = total_seats
    bl2 = max(0, int(total_seats - s1))
    bl3 = max(0, int(total_seats - s2))

    return EMSRbResult(
        protection_1=round(s1, 2),
        protection_12=round(s2, 2),
        booking_limit_1=bl1,
        booking_limit_2=bl2,
        booking_limit_3=bl3,
        total_seats=total_seats,
    )
