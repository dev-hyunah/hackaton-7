import { create } from 'zustand';
import { KE_DOMESTIC_ROUTES } from '../data/mockData';
import type { SimulationParamsDTO, SimulationResultDTO } from '../types';

const BASE_REVENUE = 54_000_000;
const BASE_LF = 72;
const BASE_DEMAND = 520;

function calcImpact(oilDelta: number, exchangeDelta: number, priceDelta: number) {
  const oilEffect = -(oilDelta * 0.15);
  // 환율 상승 → 해외여행 수요 국내로 일부 전환 (+) / 항공기재 비용 증가 (-)
  const exchangeEffect = exchangeDelta > 0 ? exchangeDelta * 0.05 - exchangeDelta * 0.08 : exchangeDelta * 0.03;
  const priceEffect = priceDelta > 0 ? -(priceDelta * 0.6) : -(priceDelta * 0.4);
  const lfDelta = oilEffect + exchangeEffect + priceEffect;
  const newLf = Math.min(100, Math.max(10, BASE_LF + lfDelta));
  const demandMul = newLf / BASE_LF;
  const priceMul = 1 + priceDelta / 100;
  const newRevenue = Math.round(BASE_REVENUE * demandMul * priceMul);
  const newDemand = Math.round(BASE_DEMAND * demandMul);
  return { newLf: Math.round(newLf), newRevenue, newDemand };
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
  route: KE_DOMESTIC_ROUTES[0],
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
    const { fuelChangePercent, exchangeRatePercent, priceChangePercent } = params;
    const impact = calcImpact(fuelChangePercent, exchangeRatePercent, priceChangePercent);
    const chartData = Array.from({ length: 8 }, (_, i) => {
      const prog = (i + 1) / 8;
      const { newRevenue, newLf } = calcImpact(
        fuelChangePercent * prog,
        exchangeRatePercent * prog,
        priceChangePercent * prog,
      );
      const baseline = Math.round(BASE_REVENUE * (0.85 + Math.random() * 0.3));
      return { month: `${i + 1}월`, baseline, simulation: newRevenue, lf: newLf };
    });
    const revDeltaPct = Math.round(((impact.newRevenue - BASE_REVENUE) / BASE_REVENUE) * 100);
    const demandDeltaPct = Math.round(((impact.newDemand - BASE_DEMAND) / BASE_DEMAND) * 100);
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
