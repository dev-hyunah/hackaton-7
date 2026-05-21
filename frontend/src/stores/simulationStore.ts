import { create } from 'zustand';
import { KE_DOMESTIC_ROUTES } from '../data/mockData';
import type { SimulationParamsDTO, SimulationResultDTO, ClassImpactDTO } from '../types';

export const SIMULATOR_ROUTES = ["국내선 전체", ...KE_DOMESTIC_ROUTES];

// 노선별 기준 데이터 (공공데이터포털 국내선 통계 기반)
const ROUTE_BASE: Record<string, { revenue: number; lf: number; demand: number }> = {
  "국내선 전체": { revenue: 54_000_000, lf: 72, demand: 520 },
  "GMP-CJU":    { revenue: 18_200_000, lf: 79, demand: 176 },
  "GMP-PUS":    { revenue: 11_400_000, lf: 62, demand: 110 },
  "ICN-CJU":    { revenue: 16_800_000, lf: 86, demand: 162 },
  "GMP-TAE":    { revenue:  4_300_000, lf: 48, demand:  41 },
  "GMP-KWJ":    { revenue:  3_600_000, lf: 52, demand:  35 },
  "ICN-PUS":    { revenue:  8_900_000, lf: 61, demand:  86 },
  "GMP-KPO":    { revenue:  3_200_000, lf: 55, demand:  31 },
  "GMP-RSU":    { revenue:  2_800_000, lf: 49, demand:  27 },
};

// IATA Economics / ICAO Demand Elasticity Studies 기준
// 단거리 아시아 국내선 등급별 가격탄력성
const CLASS_ELASTICITY: Record<string, { tier: string; elasticity: number; shareOfDemand: number }> = {
  C: { tier: "프레스티지",  elasticity: -0.45, shareOfDemand: 0.05 },
  Y: { tier: "일반 정상",  elasticity: -0.95, shareOfDemand: 0.20 },
  M: { tier: "일반 할인",  elasticity: -1.35, shareOfDemand: 0.45 },
  V: { tier: "특가",       elasticity: -1.75, shareOfDemand: 0.30 },
};

// 유류비 LF 민감도: 연료비가 총비용 약 30%를 차지하며, 10% 상승 → LF 약 1.5%p 하락 (IATA 2023)
const FUEL_LF_SENSITIVITY = -0.15;
// 환율 효과: 상승 시 해외여행 수요 일부 국내 전환(+), 항공기재 비용 증가(-)
const EXCHANGE_INBOUND_EFFECT = 0.05;
const EXCHANGE_COST_EFFECT = -0.08;

function calcImpact(
  route: string,
  oilDelta: number,
  exchangeDelta: number,
  priceDelta: number,
  log = false,
) {
  const base = ROUTE_BASE[route] ?? ROUTE_BASE["국내선 전체"];

  // 외부 요인에 의한 LF 변화 (가격 독립적)
  const oilEffect = oilDelta * FUEL_LF_SENSITIVITY;
  const exchangeEffect =
    exchangeDelta > 0
      ? exchangeDelta * EXCHANGE_INBOUND_EFFECT + exchangeDelta * EXCHANGE_COST_EFFECT
      : exchangeDelta * 0.03;
  const externalLfDelta = oilEffect + exchangeEffect;

  // 등급별 가격탄력성으로 가중평균 수요 변화 계산
  let weightedDemandChange = 0;
  const classSummary: ClassImpactDTO[] = Object.entries(CLASS_ELASTICITY).map(
    ([code, info]) => {
      const demandChangePct = info.elasticity * priceDelta;
      const revenueChangePct = demandChangePct + priceDelta;
      weightedDemandChange += demandChangePct * info.shareOfDemand;
      return {
        classCode: code,
        tier: info.tier,
        elasticity: info.elasticity,
        demandChangePct: Math.round(demandChangePct * 10) / 10,
        revenueChangePct: Math.round(revenueChangePct * 10) / 10,
      };
    },
  );

  const totalLfDelta = externalLfDelta + weightedDemandChange * (base.lf / 100);
  const newLf = Math.min(100, Math.max(10, base.lf + totalLfDelta));
  const demandMul = newLf / base.lf;
  const priceMul = 1 + priceDelta / 100;
  const newRevenue = Math.round(base.revenue * demandMul * priceMul);
  const newDemand = Math.round(base.demand * demandMul);

  if (log) {
    console.group(`[시뮬레이션] 노선: ${route}`);

    console.group('📥 입력값');
    console.log(`유가 변동:  ${oilDelta >= 0 ? '+' : ''}${oilDelta}%`);
    console.log(`환율 변동:  ${exchangeDelta >= 0 ? '+' : ''}${exchangeDelta}%`);
    console.log(`운임 조정:  ${priceDelta >= 0 ? '+' : ''}${priceDelta}%`);
    console.groupEnd();

    console.group('📊 노선 기준값');
    console.log(`기준 수익:  ${base.revenue.toLocaleString()}원/일`);
    console.log(`기준 LF:    ${base.lf}%`);
    console.log(`기준 수요:  ${base.demand}건/일`);
    console.groupEnd();

    console.group('⚙️ 외부요인 LF 변화 계산 (가격 독립적)');
    console.log(`유가효과:   ${oilDelta} × ${FUEL_LF_SENSITIVITY}(IATA 민감도) = ${oilEffect.toFixed(2)}%p`);
    if (exchangeDelta > 0) {
      console.log(`환율효과:   ${exchangeDelta} × ${EXCHANGE_INBOUND_EFFECT}(국내전환) + ${exchangeDelta} × ${EXCHANGE_COST_EFFECT}(비용증가) = ${exchangeEffect.toFixed(2)}%p`);
    } else {
      console.log(`환율효과:   ${exchangeDelta} × 0.03(하락시 소폭 수요감소) = ${exchangeEffect.toFixed(2)}%p`);
    }
    console.log(`외부요인 LF 합계: ${externalLfDelta.toFixed(2)}%p`);
    console.groupEnd();

    if (priceDelta !== 0) {
      console.group('🎯 등급별 가격탄력성 (IATA 단거리 아시아 국내선 기준)');
      console.log('탄력성 = 가격 1% 변화 시 수요 변화율 / 수익변화 = 수요변화 + 가격변화');
      console.table(
        Object.entries(CLASS_ELASTICITY).map(([code, info]) => ({
          클래스: `${code} (${info.tier})`,
          탄력성: info.elasticity,
          수요비중: `${(info.shareOfDemand * 100)}%`,
          [`수요변화 (${priceDelta >= 0 ? '+' : ''}${priceDelta}% 운임)`]: `${(info.elasticity * priceDelta).toFixed(1)}%`,
          [`수익변화`]: `${(info.elasticity * priceDelta + priceDelta).toFixed(1)}%`,
        }))
      );
      console.log(`가중평균 수요 변화: ${weightedDemandChange.toFixed(2)}%`);
      console.groupEnd();
    } else {
      console.log('ℹ️  운임 조정 없음 → 등급별 탄력성 미적용');
    }

    console.group('📈 최종 LF · 수익 계산');
    console.log(`LF 변화량:  외부요인 ${externalLfDelta.toFixed(2)} + 가격탄력성 ${(weightedDemandChange * (base.lf / 100)).toFixed(2)} = ${totalLfDelta.toFixed(2)}%p`);
    console.log(`새 LF:      ${base.lf} + ${totalLfDelta.toFixed(2)} = ${newLf}% (범위 고정: 10~100)`);
    console.log(`수요 배수:  ${newLf} / ${base.lf} = ${demandMul.toFixed(4)}`);
    console.log(`가격 배수:  1 + ${priceDelta} / 100 = ${priceMul.toFixed(4)}`);
    console.log(`새 수익:    ${base.revenue.toLocaleString()} × ${demandMul.toFixed(4)} × ${priceMul.toFixed(4)} = ${newRevenue.toLocaleString()}원`);
    console.log(`새 수요:    ${base.demand} × ${demandMul.toFixed(4)} = ${newDemand}건`);
    console.groupEnd();

    console.group('✅ 결과 요약');
    const revChangePct = Math.round((newRevenue - base.revenue) / base.revenue * 1000) / 10;
    const demandChangePct = Math.round((newDemand - base.demand) / base.demand * 1000) / 10;
    console.log(`수익 변화:  ${revChangePct >= 0 ? '+' : ''}${revChangePct}%`);
    console.log(`수요 변화:  ${demandChangePct >= 0 ? '+' : ''}${demandChangePct}%`);
    console.log(`새 LF:      ${newLf}%`);
    console.groupEnd();

    console.groupEnd();
  }

  return { newLf: Math.round(newLf * 10) / 10, newRevenue, newDemand, base, classSummary };
}

function buildRmRecommendation(
  priceDelta: number,
  oilDelta: number,
  revChangePct: number,
  newLf: number,
  route: string,
): string {
  const parts: string[] = [];

  if (oilDelta > 20) {
    parts.push(`유가 ${oilDelta}% 상승으로 비용 압박이 큽니다.`);
  } else if (oilDelta < -10) {
    parts.push(`유가 ${Math.abs(oilDelta)}% 하락으로 비용 절감 여지가 생겼습니다.`);
  }

  if (priceDelta > 0 && newLf < 60) {
    parts.push(`운임 인상(+${priceDelta}%) 시 탑승률이 ${newLf}%로 하락해 수익성 개선 효과가 제한됩니다. 할인 클래스(M/V) 가격을 유지하거나 소폭 인하를 권장합니다.`);
  } else if (priceDelta > 0 && newLf >= 75) {
    parts.push(`운임 인상(+${priceDelta}%) 후에도 탑승률 ${newLf}%를 유지해 수익 극대화 구간입니다.`);
  } else if (priceDelta < 0 && newLf >= 85) {
    parts.push(`운임 인하(${priceDelta}%) 시 탑승률 ${newLf}%로 높은 편이지만, 좌석당 수익이 감소합니다. C/Y 클래스 위주 단계적 회복을 권장합니다.`);
  } else if (priceDelta < 0 && newLf < 70) {
    parts.push(`운임 인하(${priceDelta}%)에도 탑승률이 ${newLf}%에 그칩니다. ${route} 노선 수요 자체가 낮으므로 추가 마케팅 검토가 필요합니다.`);
  }

  if (revChangePct > 5) {
    parts.push(`종합 수익은 기준 대비 +${revChangePct}% 개선이 예상됩니다.`);
  } else if (revChangePct < -5) {
    parts.push(`종합 수익은 기준 대비 ${revChangePct}% 감소가 예상됩니다. 비용 구조 재검토를 권장합니다.`);
  } else {
    parts.push(`수익 변화는 기준 대비 ${revChangePct >= 0 ? '+' : ''}${revChangePct}%로 현상 유지 수준입니다.`);
  }

  return parts.join(' ');
}

interface SimulationStore {
  params: SimulationParamsDTO;
  result: SimulationResultDTO | null;
  isRunning: boolean;
  showModal: boolean;

  setParams: (params: Partial<SimulationParamsDTO>) => void;
  runSimulation: () => Promise<void>;
  reset: () => void;
  closeModal: () => void;
}

const defaultParams: SimulationParamsDTO = {
  route: "국내선 전체",
  date: new Date().toISOString().slice(0, 10),
  fuelChangePercent: 0,
  exchangeRatePercent: 0,
  priceChangePercent: 0,
};

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  params: { ...defaultParams },
  result: null,
  isRunning: false,
  showModal: false,

  setParams: (partial) => {
    set((state) => ({ params: { ...state.params, ...partial } }));
  },

  runSimulation: async () => {
    set({ isRunning: true });
    await new Promise((r) => setTimeout(r, 800));
    const { params } = get();
    const { route, fuelChangePercent, exchangeRatePercent, priceChangePercent } = params;
    const impact = calcImpact(route, fuelChangePercent, exchangeRatePercent, priceChangePercent, true);
    const { base } = impact;

    const chartData = Array.from({ length: 8 }, (_, i) => {
      const prog = (i + 1) / 8;
      const pt = calcImpact(
        route,
        fuelChangePercent * prog,
        exchangeRatePercent * prog,
        priceChangePercent * prog,
      );
      // 기준선은 시드 고정 난수로 자연스러운 변동 표현
      const seed = i * 1337;
      const pseudoRand = ((Math.sin(seed) + 1) / 2) * 0.3 + 0.85;
      const baseline = Math.round(base.revenue * pseudoRand);
      return { month: `${i + 1}월`, baseline, simulation: pt.newRevenue, lf: pt.newLf };
    });

    const revDeltaPct = Math.round(((impact.newRevenue - base.revenue) / base.revenue) * 100 * 10) / 10;
    const demandDeltaPct = Math.round(((impact.newDemand - base.demand) / base.demand) * 100 * 10) / 10;
    const rmRecommendation = buildRmRecommendation(
      priceChangePercent,
      fuelChangePercent,
      revDeltaPct,
      impact.newLf,
      route,
    );

    set({
      result: {
        expectedDemandChange: demandDeltaPct,
        expectedRevenueChange: revDeltaPct,
        optimalPriceRange: { min: impact.newRevenue * 0.9, max: impact.newRevenue * 1.1 },
        chartData,
        classSummary: impact.classSummary,
        rmRecommendation,
      },
      isRunning: false,
      showModal: true,
    });
  },

  reset: () => {
    set({ params: { ...defaultParams }, result: null, isRunning: false, showModal: false });
  },

  closeModal: () => {
    set({ showModal: false });
  },
}));
