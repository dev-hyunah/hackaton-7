import { create } from 'zustand';
import { buildDashboardFlights, KE_DOMESTIC_ROUTES } from '../data/mockData';
import type { DashboardFlight } from '../data/mockData';

interface FlightsStore {
  // 노선별 flights 캐시. key: route (e.g. "GMP-CJU")
  flightsByRoute: Record<string, DashboardFlight[]>;
  setFlightsForRoute: (route: string, flights: DashboardFlight[]) => void;
  getFlightsForRoute: (route: string) => DashboardFlight[];
}

const todayStr = new Date().toISOString().slice(0, 10);

export const useFlightsStore = create<FlightsStore>((set, get) => ({
  flightsByRoute: Object.fromEntries(
    KE_DOMESTIC_ROUTES.map((r) => [r, buildDashboardFlights(r, todayStr)]),
  ),

  setFlightsForRoute: (route, flights) =>
    set((state) => ({
      flightsByRoute: { ...state.flightsByRoute, [route]: flights },
    })),

  getFlightsForRoute: (route) =>
    get().flightsByRoute[route] ?? buildDashboardFlights(route, todayStr),
}));
