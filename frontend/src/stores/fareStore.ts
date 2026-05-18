import { create } from 'zustand';
import { buildDashboardFlights, KE_DOMESTIC_ROUTES } from '../data/mockData';
import type { FlightFareDTO, PriceHistoryDTO } from '../types';

interface FareStore {
  selectedRoute: string;
  selectedFlightId: string | null;
  fareData: FlightFareDTO | null;
  allFlights: FlightFareDTO[];
  priceHistory: PriceHistoryDTO[];

  setRoute: (route: string) => void;
  fetchFlights: (route: string) => void;
  selectFlight: (flightId: string) => void;
  updateFare: (flightId: string, classCode: string, newPrice: number) => void;
  fetchPriceHistory: (flightId: string) => void;
}

function buildFlights(route: string): FlightFareDTO[] {
  return buildDashboardFlights(route).map((raw) => ({
    flightId: raw.id,
    flightNumber: raw.id,
    route,
    departureTime: raw.time,
    timeSlot: raw.timeSlot === '아침' ? 'morning' as const
      : raw.timeSlot === '오전' ? 'forenoon' as const
      : raw.timeSlot === '오후' ? 'afternoon' as const
      : 'evening' as const,
    loadFactor: raw.lf,
    pace: parseInt(raw.pace.replace('%', '').replace('+', ''), 10) || 0,
    currentPrice: raw.currentPrice,
    aiRecommendedPrice: raw.aiRecommended !== raw.currentPrice ? raw.aiRecommended : null,
    status: raw.status === '수요 급증' ? 'demand_surge' as const
      : raw.status === '안정적' ? 'stable' as const
      : raw.status === '수요 저조' ? 'low_demand' as const
      : 'critical' as const,
    classes: raw.classes.map((c) => ({
      classCode: c.code,
      tier: c.name.includes('일등석') ? 'prestige' as const
        : c.name.includes('프레스티지') ? 'prestige' as const
        : c.name.includes('일반석') ? 'economy_full' as const
        : 'economy_special' as const,
      status: c.status === 'Open' ? 'open' as const
        : c.status === 'Sold Out' ? 'sold_out' as const
        : 'closed' as const,
      currentPrice: c.price,
      aiRecommendedPrice: c.aiPrice !== c.price ? c.aiPrice : null,
      soldSeats: c.sold,
      totalSeats: c.seats,
    })),
    baseCost: raw.baseCost,
    analysisReason: raw.reason,
  }));
}

const initialFlights = buildFlights(KE_DOMESTIC_ROUTES[0]);

export const useFareStore = create<FareStore>((set, get) => ({
  selectedRoute: KE_DOMESTIC_ROUTES[0],
  selectedFlightId: initialFlights[0]?.flightId ?? null,
  fareData: initialFlights[0] ?? null,
  allFlights: initialFlights,
  priceHistory: [],

  setRoute: (route) => {
    const flights = buildFlights(route);
    set({
      selectedRoute: route,
      allFlights: flights,
      selectedFlightId: flights[0]?.flightId ?? null,
      fareData: flights[0] ?? null,
      priceHistory: [],
    });
  },

  fetchFlights: (route) => {
    const flights = buildFlights(route);
    set({
      selectedRoute: route,
      allFlights: flights,
      selectedFlightId: flights[0]?.flightId ?? null,
      fareData: flights[0] ?? null,
    });
  },

  selectFlight: (flightId) => {
    const { allFlights } = get();
    const flight = allFlights.find((f) => f.flightId === flightId) ?? null;
    set({ selectedFlightId: flightId, fareData: flight, priceHistory: [] });
  },

  updateFare: (flightId, classCode, newPrice) => {
    if (newPrice <= 0) return;
    set((state) => {
      const updated = state.allFlights.map((f) => {
        if (f.flightId !== flightId) return f;
        const oldClass = f.classes.find((c) => c.classCode === classCode);
        const oldPrice = oldClass?.currentPrice ?? 0;
        const classes = f.classes.map((c) =>
          c.classCode === classCode ? { ...c, currentPrice: newPrice } : c
        );
        void oldPrice;
        return { ...f, classes };
      });
      const newHistory: PriceHistoryDTO = {
        id: `PH-${Date.now()}`,
        fareTierId: `${flightId}-${classCode}`,
        classCode,
        changeType: 'MANUAL',
        priceBefore: state.allFlights.find((f) => f.flightId === flightId)
          ?.classes.find((c) => c.classCode === classCode)?.currentPrice ?? 0,
        priceAfter: newPrice,
        changedBy: 'RM',
        changedAt: new Date().toISOString(),
      };
      return {
        allFlights: updated,
        fareData: updated.find((f) => f.flightId === flightId) ?? state.fareData,
        priceHistory: [newHistory, ...state.priceHistory],
      };
    });
  },

  fetchPriceHistory: (_flightId) => {
    set({ priceHistory: [] });
  },
}));
