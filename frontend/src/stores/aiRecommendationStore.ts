import { create } from 'zustand';
import { buildDashboardFlights, KE_DOMESTIC_ROUTES } from '../data/mockData';
import type { AiRecommendationDTO, RecommendationStatus } from '../types';

interface AiRecommendationStore {
  recommendations: AiRecommendationDTO[];

  /** 새 추천을 기존 목록에 머지 — 이미 있는 항목은 status 유지, 없는 항목만 추가 */
  fetchRecommendations: (route?: string) => void;
  /** 새로고침 시 전체 초기화 후 재생성 */
  resetRecommendations: (route?: string) => void;
  approveRecommendation: (recommendationId: string) => void;
  rejectRecommendation: (recommendationId: string) => void;
}

function buildRecs(route: string): AiRecommendationDTO[] {
  const flights = buildDashboardFlights(route);
  const recs: AiRecommendationDTO[] = [];
  for (const flight of flights) {
    for (const cls of flight.classes) {
      if (cls.aiPrice === cls.price) continue;
      const pct = Math.round((cls.aiPrice - cls.price) / cls.price * 100);
      recs.push({
        recommendationId: `${flight.id}-${cls.code}`,
        flightId: flight.id,
        flightNumber: flight.id,
        route,
        departureTime: flight.time,
        classCode: cls.code,
        tier: cls.name.includes('일등석') ? 'prestige'
          : cls.name.includes('프레스티지') ? 'prestige'
          : cls.name.includes('일반석') ? 'economy_full'
          : 'economy_special',
        currentPrice: cls.price,
        recommendedPrice: cls.aiPrice,
        rationale: flight.reason,
        changePercent: pct,
        confidence: Math.round(70 + Math.abs(pct) * 0.8),
        predictedLoadFactor: Math.min(98, Math.round(flight.lf + Math.abs(pct) * 0.3)),
        requiresManualApproval: true,
        status: 'pending' as RecommendationStatus,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return recs;
}

const initialRecs = buildRecs(KE_DOMESTIC_ROUTES[0]);

export const useAiRecommendationStore = create<AiRecommendationStore>((set, get) => ({
  recommendations: initialRecs,

  fetchRecommendations: (route) => {
    const incoming = buildRecs(route ?? KE_DOMESTIC_ROUTES[0]);
    const existing = get().recommendations;
    const existingMap = new Map(existing.map((r) => [r.recommendationId, r]));
    // 이미 있는 항목은 현재 status 유지, 신규 항목만 pending으로 추가
    const merged = incoming.map((r) =>
      existingMap.has(r.recommendationId)
        ? { ...r, status: existingMap.get(r.recommendationId)!.status }
        : r,
    );
    set({ recommendations: merged });
  },

  resetRecommendations: (route) => {
    set({ recommendations: buildRecs(route ?? KE_DOMESTIC_ROUTES[0]) });
  },

  approveRecommendation: (recommendationId) => {
    set((state) => ({
      recommendations: state.recommendations.map((r) =>
        r.recommendationId === recommendationId ? { ...r, status: 'approved' as RecommendationStatus } : r
      ),
    }));
  },

  rejectRecommendation: (recommendationId) => {
    set((state) => ({
      recommendations: state.recommendations.map((r) =>
        r.recommendationId === recommendationId ? { ...r, status: 'rejected' as RecommendationStatus } : r
      ),
    }));
  },
}));
