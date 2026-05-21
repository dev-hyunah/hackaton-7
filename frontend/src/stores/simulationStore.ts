import { create } from 'zustand';
import { KE_DOMESTIC_ROUTES } from '../data/mockData';
import type { SimulationParamsDTO, SimulationResultDTO } from '../types';

export const SIMULATOR_ROUTES = ["국내선 전체", ...KE_DOMESTIC_ROUTES];

// 노선별 기준 데이터
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

function calcImpact(route: string, oilDelta: number, exchangeDelta: number, priceDelta: number) {
  const base = ROUTE_BASE[route] ?? ROUTE_BASE["국내선 전체"];
  const oilEffect = -(oilDelta * 0.15);
  const exchangeEffect = exchangeDelta > 0 ? exchangeDelta * 0.05 - exchangeDelta * 0.08 : exchangeDelta * 0.03;
  const priceEffect = priceDelta > 0 ? -(priceDelta * 0.6) : -(priceDelta * 0.4);
  const lfDelta = oilEffect + exchangeEffect + priceEffect;
  const newLf = Math.min(100, Math.max(10, base.lf + lfDelta));
  const demandMul = newLf / base.lf;
  const priceMul = 1 + priceDelta / 100;
  const newRevenue = Math.round(base.revenue * demandMul * priceMul);
  const newDemand = Math.round(base.demand * demandMul);
  return { newLf: Math.round(newLf), newRevenue, newDemand, base };
}

interface SimulationStore {
  params: SimulationParamsDTO;
  result: SimulationResultDTO | null;
  isRunning: boolean;

  setParams: (params: Partial<SimulationParamsDTO>) => void;
  runSimulation: () => Promise<void>;
  reset: () => void;
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

  setParams: (partial) => {
    set((state) => ({ params: { ...state.params, ...partial } }));
  },

  runSimulation: async () => {
    set({ isRunning: true });
    await new Promise((r) => setTimeout(r, 800));
    const { params } = get();
    const { route, fuelChangePercent, exchangeRatePercent, priceChangePercent } = params;
    const impact = calcImpact(route, fuelChangePercent, exchangeRatePercent, priceChangePercent);
    const { base } = impact;
    const chartData = Array.from({ length: 8 }, (_, i) => {
      const prog = (i + 1) / 8;
      const { newRevenue, newLf } = calcImpact(
        route,
        fuelChangePercent * prog,
        exchangeRatePercent * prog,
        priceChangePercent * prog,
      );
      const baseline = Math.round(base.revenue * (0.85 + Math.random() * 0.3));
      return { month: `${i + 1}월`, baseline, simulation: newRevenue, lf: newLf };
    });
    const revDeltaPct = Math.round(((impact.newRevenue - base.revenue) / base.revenue) * 100);
    const demandDeltaPct = Math.round(((impact.newDemand - base.demand) / base.demand) * 100);
    set({
      result: {
        expectedDemandChange: demandDeltaPct,
        expectedRevenueChange: revDeltaPct,
        optimalPriceRange: { min: impact.newRevenue * 0.9, max: impact.newRevenue * 1.1 },
        chartData,
      },
      isRunning: false,
    });
  },

  reset: () => {
    set({ params: { ...defaultParams }, result: null, isRunning: false });
  },
}));
