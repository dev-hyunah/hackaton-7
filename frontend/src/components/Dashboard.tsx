import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, Users, Plane, AlertCircle } from "lucide-react";
import { KE_DOMESTIC_ROUTES } from "../data/mockData";
import apiClient from "../api/apiClient";
import { useFlightsStore } from "../stores/flightsStore";
import { useAiRecommendationStore } from "../stores/aiRecommendationStore";

const BRAND = "#002561";

const fmt = (n: number) =>
  n >= 100_000_000
    ? `${(n / 100_000_000).toFixed(1)}억`
    : `${Math.round(n / 10_000).toLocaleString()}만`;

const loadFactorColor = (lf: number) => {
  if (lf >= 85) return "#ef4444";
  if (lf >= 65) return "#f59e0b";
  return "#3b82f6";
};

const PERIOD_OPTIONS = [
  { label: "1일", value: 1 },
  { label: "3일", value: 3 },
  { label: "7일", value: 7 },
  { label: "10일", value: 10 },
];

interface DashboardSummary {
  total_revenue: number;
  total_bookings: number;
  avg_load_factor: number;
  pending_recommendations: number;
  revenue_history: { date: string; revenue: number; bookings: number }[];
  route_lf: { label: string; lf: number }[];
  class_lf: { label: string; lf: number }[];
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
// 수익 추이: 5/15(목)~5/24(토). 금·토·일 주말 급등, 화·수 최저, 특가 프로모션 이벤트 반영
const MOCK_REVENUE_HISTORY: Record<string, { date: string; revenue: number; bookings: number }[]> = {
  // 국내선 전체 — 주말(16토·17일·23금·24토) 급등, 화19·수20 저점
  all: [
    { date: "5/15(목)", revenue: 312_400_000, bookings: 3_012 },
    { date: "5/16(금)", revenue: 468_700_000, bookings: 4_521 },
    { date: "5/17(토)", revenue: 531_200_000, bookings: 5_118 },
    { date: "5/18(일)", revenue: 489_300_000, bookings: 4_712 },
    { date: "5/19(월)", revenue: 271_800_000, bookings: 2_618 },
    { date: "5/20(화)", revenue: 243_100_000, bookings: 2_341 },
    { date: "5/21(수)", revenue: 258_600_000, bookings: 2_493 },
    { date: "5/22(목)", revenue: 334_200_000, bookings: 3_221 },
    { date: "5/23(금)", revenue: 492_500_000, bookings: 4_748 },
    { date: "5/24(토)", revenue: 558_900_000, bookings: 5_389 },
  ],
  // GMP-CJU — 최대 수요 노선, 주말 거의 매진
  "GMP-CJU": [
    { date: "5/15(목)", revenue:  78_600_000, bookings:  758 },
    { date: "5/16(금)", revenue: 128_400_000, bookings: 1_238 },
    { date: "5/17(토)", revenue: 151_700_000, bookings: 1_463 },
    { date: "5/18(일)", revenue: 139_200_000, bookings: 1_342 },
    { date: "5/19(월)", revenue:  61_300_000, bookings:  591 },
    { date: "5/20(화)", revenue:  54_800_000, bookings:  528 },
    { date: "5/21(수)", revenue:  63_500_000, bookings:  612 },
    { date: "5/22(목)", revenue:  86_400_000, bookings:  833 },
    { date: "5/23(금)", revenue: 132_900_000, bookings: 1_281 },
    { date: "5/24(토)", revenue: 158_200_000, bookings: 1_525 },
  ],
  // ICN-CJU — 인천발 프리미엄, 평일도 LF 높음
  "ICN-CJU": [
    { date: "5/15(목)", revenue:  72_100_000, bookings:  694 },
    { date: "5/16(금)", revenue: 103_400_000, bookings:  996 },
    { date: "5/17(토)", revenue: 118_800_000, bookings: 1_144 },
    { date: "5/18(일)", revenue: 110_200_000, bookings: 1_061 },
    { date: "5/19(월)", revenue:  58_700_000, bookings:  565 },
    { date: "5/20(화)", revenue:  52_300_000, bookings:  504 },
    { date: "5/21(수)", revenue:  61_900_000, bookings:  596 },
    { date: "5/22(목)", revenue:  78_500_000, bookings:  756 },
    { date: "5/23(금)", revenue: 108_200_000, bookings: 1_042 },
    { date: "5/24(토)", revenue: 122_600_000, bookings: 1_181 },
  ],
  // GMP-PUS — 중간 노선, 주말 상승폭 완만
  "GMP-PUS": [
    { date: "5/15(목)", revenue: 33_200_000, bookings:  320 },
    { date: "5/16(금)", revenue: 52_700_000, bookings:  508 },
    { date: "5/17(토)", revenue: 61_400_000, bookings:  591 },
    { date: "5/18(일)", revenue: 55_100_000, bookings:  531 },
    { date: "5/19(월)", revenue: 24_800_000, bookings:  239 },
    { date: "5/20(화)", revenue: 21_600_000, bookings:  208 },
    { date: "5/21(수)", revenue: 26_300_000, bookings:  253 },
    { date: "5/22(목)", revenue: 38_100_000, bookings:  367 },
    { date: "5/23(금)", revenue: 55_900_000, bookings:  539 },
    { date: "5/24(토)", revenue: 64_800_000, bookings:  624 },
  ],
  // GMP-TAE — 지방 노선, 전반적으로 낮고 변동 큼
  "GMP-TAE": [
    { date: "5/15(목)", revenue:  9_800_000, bookings:  94 },
    { date: "5/16(금)", revenue: 18_400_000, bookings: 177 },
    { date: "5/17(토)", revenue: 22_100_000, bookings: 213 },
    { date: "5/18(일)", revenue: 19_700_000, bookings: 190 },
    { date: "5/19(월)", revenue:  6_200_000, bookings:  60 },
    { date: "5/20(화)", revenue:  5_100_000, bookings:  49 },
    { date: "5/21(수)", revenue:  7_400_000, bookings:  71 },
    { date: "5/22(목)", revenue: 11_600_000, bookings: 112 },
    { date: "5/23(금)", revenue: 19_800_000, bookings: 191 },
    { date: "5/24(토)", revenue: 24_300_000, bookings: 234 },
  ],
  // GMP-KWJ — 저수요 노선
  "GMP-KWJ": [
    { date: "5/15(목)", revenue:  8_100_000, bookings:  78 },
    { date: "5/16(금)", revenue: 14_600_000, bookings: 141 },
    { date: "5/17(토)", revenue: 17_200_000, bookings: 166 },
    { date: "5/18(일)", revenue: 15_400_000, bookings: 148 },
    { date: "5/19(월)", revenue:  5_300_000, bookings:  51 },
    { date: "5/20(화)", revenue:  4_600_000, bookings:  44 },
    { date: "5/21(수)", revenue:  6_100_000, bookings:  59 },
    { date: "5/22(목)", revenue:  9_700_000, bookings:  93 },
    { date: "5/23(금)", revenue: 15_800_000, bookings: 152 },
    { date: "5/24(토)", revenue: 19_100_000, bookings: 184 },
  ],
  // ICN-PUS — 중간, 출장 수요로 평일도 어느 정도 유지
  "ICN-PUS": [
    { date: "5/15(목)", revenue: 34_400_000, bookings:  331 },
    { date: "5/16(금)", revenue: 51_200_000, bookings:  493 },
    { date: "5/17(토)", revenue: 58_600_000, bookings:  564 },
    { date: "5/18(일)", revenue: 52_100_000, bookings:  502 },
    { date: "5/19(월)", revenue: 28_700_000, bookings:  276 },
    { date: "5/20(화)", revenue: 24_300_000, bookings:  234 },
    { date: "5/21(수)", revenue: 29_800_000, bookings:  287 },
    { date: "5/22(목)", revenue: 38_600_000, bookings:  372 },
    { date: "5/23(금)", revenue: 53_400_000, bookings:  514 },
    { date: "5/24(토)", revenue: 61_700_000, bookings:  594 },
  ],
  // GMP-KPO — 소도시 노선
  "GMP-KPO": [
    { date: "5/15(목)", revenue:  7_300_000, bookings:  70 },
    { date: "5/16(금)", revenue: 13_100_000, bookings: 126 },
    { date: "5/17(토)", revenue: 15_800_000, bookings: 152 },
    { date: "5/18(일)", revenue: 13_400_000, bookings: 129 },
    { date: "5/19(월)", revenue:  4_900_000, bookings:  47 },
    { date: "5/20(화)", revenue:  4_100_000, bookings:  40 },
    { date: "5/21(수)", revenue:  5_600_000, bookings:  54 },
    { date: "5/22(목)", revenue:  8_900_000, bookings:  86 },
    { date: "5/23(금)", revenue: 14_200_000, bookings: 137 },
    { date: "5/24(토)", revenue: 17_100_000, bookings: 165 },
  ],
  // GMP-RSU — 최저 수요, 주중 거의 빈자리
  "GMP-RSU": [
    { date: "5/15(목)", revenue:  5_400_000, bookings:  52 },
    { date: "5/16(금)", revenue: 10_200_000, bookings:  98 },
    { date: "5/17(토)", revenue: 13_100_000, bookings: 126 },
    { date: "5/18(일)", revenue: 11_600_000, bookings: 112 },
    { date: "5/19(월)", revenue:  3_200_000, bookings:  31 },
    { date: "5/20(화)", revenue:  2_800_000, bookings:  27 },
    { date: "5/21(수)", revenue:  3_700_000, bookings:  36 },
    { date: "5/22(목)", revenue:  6_100_000, bookings:  59 },
    { date: "5/23(금)", revenue: 10_800_000, bookings: 104 },
    { date: "5/24(토)", revenue: 14_200_000, bookings: 137 },
  ],
};

// 실제 항공사 좌석 판매 순서: V(특가) 최초 오픈→M(할인)→Y(정상)→C(프레스티지)
// 인기 노선(ICN-CJU, GMP-CJU): V·M 거의 매진, Y 높음, C 중고
// 비인기 노선(GMP-RSU, GMP-TAE): V도 50~60% 수준, C 상대적으로 높음(출장자)
const MOCK_CLASS_LF: Record<string, { label: string; lf: number }[]> = {
  all:       [{ label: "C (프레스티지)", lf: 68.4 }, { label: "Y (일반 정상)", lf: 71.2 }, { label: "M (일반 할인)", lf: 82.7 }, { label: "V (특가)",      lf: 91.5 }],
  "GMP-CJU": [{ label: "C (프레스티지)", lf: 76.3 }, { label: "Y (일반 정상)", lf: 81.4 }, { label: "M (일반 할인)", lf: 93.8 }, { label: "V (특가)",      lf: 97.2 }],
  "ICN-CJU": [{ label: "C (프레스티지)", lf: 82.1 }, { label: "Y (일반 정상)", lf: 87.6 }, { label: "M (일반 할인)", lf: 95.4 }, { label: "V (특가)",      lf: 99.1 }],
  "GMP-PUS": [{ label: "C (프레스티지)", lf: 58.7 }, { label: "Y (일반 정상)", lf: 61.3 }, { label: "M (일반 할인)", lf: 73.9 }, { label: "V (특가)",      lf: 84.6 }],
  "ICN-PUS": [{ label: "C (프레스티지)", lf: 63.2 }, { label: "Y (일반 정상)", lf: 67.8 }, { label: "M (일반 할인)", lf: 78.4 }, { label: "V (특가)",      lf: 88.3 }],
  "GMP-TAE": [{ label: "C (프레스티지)", lf: 47.6 }, { label: "Y (일반 정상)", lf: 38.4 }, { label: "M (일반 할인)", lf: 44.2 }, { label: "V (특가)",      lf: 56.8 }],
  "GMP-KWJ": [{ label: "C (프레스티지)", lf: 44.1 }, { label: "Y (일반 정상)", lf: 33.7 }, { label: "M (일반 할인)", lf: 39.6 }, { label: "V (특가)",      lf: 52.3 }],
  "GMP-KPO": [{ label: "C (프레스티지)", lf: 41.8 }, { label: "Y (일반 정상)", lf: 35.2 }, { label: "M (일반 할인)", lf: 41.9 }, { label: "V (특가)",      lf: 55.1 }],
  "GMP-RSU": [{ label: "C (프레스티지)", lf: 38.4 }, { label: "Y (일반 정상)", lf: 29.6 }, { label: "M (일반 할인)", lf: 34.7 }, { label: "V (특가)",      lf: 47.9 }],
};

// 노선별 편명 LF — 인기편(오전 출발)은 높고, 비인기편(오후 늦음)은 낮음
const MOCK_ROUTE_LF: Record<string, { label: string; lf: number }[]> = {
  all: [
    { label: "KE1201 GMP-CJU", lf: 97 },
    { label: "KE1801 ICN-CJU", lf: 95 },
    { label: "KE1205 GMP-CJU", lf: 88 },
    { label: "KE1901 ICN-PUS", lf: 79 },
    { label: "KE1401 GMP-PUS", lf: 74 },
    { label: "KE1207 GMP-CJU", lf: 48 },
    { label: "KE2101 GMP-RSU", lf: 31 },
  ],
  "GMP-CJU": [
    { label: "KE1201 (07:25)", lf: 97 }, { label: "KE1203 (09:40)", lf: 86 },
    { label: "KE1205 (12:10)", lf: 88 }, { label: "KE1207 (18:50)", lf: 48 },
  ],
  "ICN-CJU": [
    { label: "KE1801 (08:15)", lf: 95 }, { label: "KE1803 (11:30)", lf: 83 },
    { label: "KE1805 (16:00)", lf: 71 }, { label: "KE1807 (20:10)", lf: 53 },
  ],
  "GMP-PUS": [
    { label: "KE1401 (07:50)", lf: 74 }, { label: "KE1403 (10:20)", lf: 68 },
    { label: "KE1405 (14:35)", lf: 57 }, { label: "KE1407 (19:00)", lf: 43 },
  ],
  "ICN-PUS": [
    { label: "KE1901 (08:40)", lf: 79 }, { label: "KE1903 (13:15)", lf: 64 },
    { label: "KE1905 (18:30)", lf: 51 },
  ],
  "GMP-TAE": [
    { label: "KE1601 (08:30)", lf: 58 }, { label: "KE1603 (12:45)", lf: 44 },
    { label: "KE1605 (17:20)", lf: 31 },
  ],
  "GMP-KWJ": [
    { label: "KE1701 (08:55)", lf: 54 }, { label: "KE1703 (13:10)", lf: 41 },
    { label: "KE1705 (17:40)", lf: 28 },
  ],
  "GMP-KPO": [
    { label: "KE2001 (09:05)", lf: 56 }, { label: "KE2003 (13:30)", lf: 43 },
    { label: "KE2005 (18:00)", lf: 30 },
  ],
  "GMP-RSU": [
    { label: "KE2101 (09:20)", lf: 47 }, { label: "KE2103 (14:00)", lf: 32 },
    { label: "KE2105 (18:25)", lf: 19 },
  ],
};

const MOCK_KPI: Record<string, Record<number, { revenue: number; bookings: number; avgLf: number; pending: number }>> = {
  all:       { 1: { revenue: 558_900_000, bookings: 5_389, avgLf: 81.3, pending: 5 }, 3: { revenue: 1_550_200_000, bookings: 14_938, avgLf: 78.7, pending: 9 }, 7: { revenue: 3_098_300_000, bookings: 29_813, avgLf: 74.2, pending: 17 }, 10: { revenue: 3_960_500_000, bookings: 38_155, avgLf: 72.1, pending: 23 } },
  "GMP-CJU": { 1: { revenue: 158_200_000, bookings: 1_525, avgLf: 92.6, pending: 1 }, 3: { revenue: 422_300_000, bookings: 4_068, avgLf: 88.4, pending: 3 }, 7: { revenue: 883_100_000, bookings: 8_507, avgLf: 84.9, pending: 6 }, 10: { revenue: 1_094_800_000, bookings: 10_551, avgLf: 82.3, pending: 8 } },
  "ICN-CJU": { 1: { revenue: 122_600_000, bookings: 1_181, avgLf: 88.2, pending: 1 }, 3: { revenue: 330_800_000, bookings: 3_188, avgLf: 85.6, pending: 3 }, 7: { revenue: 686_100_000, bookings: 6_606, avgLf: 82.3, pending: 5 }, 10: { revenue: 886_900_000, bookings: 8_539, avgLf: 80.1, pending: 7 } },
  "GMP-PUS": { 1: { revenue:  64_800_000, bookings:  624, avgLf: 67.4, pending: 1 }, 3: { revenue: 171_300_000, bookings: 1_650, avgLf: 63.8, pending: 2 }, 7: { revenue: 352_800_000, bookings: 3_398, avgLf: 61.2, pending: 4 }, 10: { revenue: 473_900_000, bookings: 4_564, avgLf: 59.7, pending: 5 } },
  "ICN-PUS": { 1: { revenue:  61_700_000, bookings:  594, avgLf: 71.8, pending: 1 }, 3: { revenue: 163_700_000, bookings: 1_577, avgLf: 68.3, pending: 2 }, 7: { revenue: 338_400_000, bookings: 3_260, avgLf: 65.4, pending: 3 }, 10: { revenue: 432_900_000, bookings: 4_170, avgLf: 63.1, pending: 4 } },
  "GMP-TAE": { 1: { revenue:  24_300_000, bookings:  234, avgLf: 44.3, pending: 0 }, 3: { revenue:  62_100_000, bookings:  598, avgLf: 42.7, pending: 1 }, 7: { revenue: 121_100_000, bookings: 1_166, avgLf: 43.9, pending: 2 }, 10: { revenue: 144_500_000, bookings: 1_391, avgLf: 41.6, pending: 3 } },
  "GMP-KWJ": { 1: { revenue:  19_100_000, bookings:  184, avgLf: 41.2, pending: 0 }, 3: { revenue:  49_500_000, bookings:  477, avgLf: 39.4, pending: 1 }, 7: { revenue:  92_100_000, bookings:  887, avgLf: 40.7, pending: 1 }, 10: { revenue: 110_400_000, bookings: 1_064, avgLf: 38.2, pending: 2 } },
  "GMP-KPO": { 1: { revenue:  17_100_000, bookings:  165, avgLf: 43.1, pending: 0 }, 3: { revenue:  43_200_000, bookings:  416, avgLf: 41.6, pending: 1 }, 7: { revenue:  83_900_000, bookings:  808, avgLf: 42.8, pending: 1 }, 10: { revenue: 103_900_000, bookings: 1_001, avgLf: 40.4, pending: 2 } },
  "GMP-RSU": { 1: { revenue:  14_200_000, bookings:  137, avgLf: 32.9, pending: 0 }, 3: { revenue:  34_200_000, bookings:  330, avgLf: 31.3, pending: 0 }, 7: { revenue:  61_400_000, bookings:  591, avgLf: 32.8, pending: 1 }, 10: { revenue:  71_600_000, bookings:  690, avgLf: 30.7, pending: 1 } },
};

function getMockSummary(routeParam: string, days: number): DashboardSummary {
  const kpi = MOCK_KPI[routeParam]?.[days] ?? MOCK_KPI.all[1];
  const history = (MOCK_REVENUE_HISTORY[routeParam] ?? MOCK_REVENUE_HISTORY.all).slice(-days);
  const lf = MOCK_ROUTE_LF[routeParam] ?? MOCK_ROUTE_LF.all;
  const classLf = MOCK_CLASS_LF[routeParam] ?? MOCK_CLASS_LF.all;
  return {
    total_revenue: kpi.revenue,
    total_bookings: kpi.bookings,
    avg_load_factor: kpi.avgLf,
    pending_recommendations: kpi.pending,
    revenue_history: history,
    route_lf: lf,
    class_lf: classLf,
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard({ refreshKey }: { refreshKey?: number }) {
  const [periodDays, setPeriodDays] = useState(10);
  const [dashboardRoute, setDashboardRoute] = useState("전체");
  const [summary, setSummary] = useState<DashboardSummary>(() =>
    getMockSummary("all", 10)
  );

  const routeParam = dashboardRoute === "전체" ? "all" : dashboardRoute;

  const fetchSummary = useCallback(async (route: string, days: number) => {
    try {
      const data = await apiClient.get<DashboardSummary>(
        `/dashboard/summary?route_id=${route}&days=${days}`
      );
      if (data && data.revenue_history !== undefined) {
        setSummary(data);
        return;
      }
    } catch { /* fall through to mock */ }
    setSummary(getMockSummary(route, days));
  }, []);

  // 노선/기간이 실제로 변경될 때만 summary 재조회 (마운트 시 제외)
  const prevRouteParamRef = useRef(routeParam);
  const prevPeriodDaysRef = useRef(periodDays);
  useEffect(() => {
    const routeChanged = prevRouteParamRef.current !== routeParam;
    const daysChanged = prevPeriodDaysRef.current !== periodDays;
    prevRouteParamRef.current = routeParam;
    prevPeriodDaysRef.current = periodDays;
    if (!routeChanged && !daysChanged) return;
    void fetchSummary(routeParam, periodDays);
  }, [routeParam, periodDays, fetchSummary]);

  // 새로고침 버튼 클릭 시에만 summary 재조회
  useEffect(() => {
    if (!refreshKey) return;
    void fetchSummary(routeParam, periodDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const { flightsByRoute } = useFlightsStore();
  const { recommendations } = useAiRecommendationStore();
  const pendingRecsLive = recommendations.filter((r) => r.status === "pending").length;

  // FareManagement에서 업데이트된 실시간 flights를 반영한 LF/수익 파생
  const liveStats = useMemo(() => {
    const routes = dashboardRoute === "전체" ? KE_DOMESTIC_ROUTES : [dashboardRoute];
    const allFlights = routes.flatMap((r) => flightsByRoute[r] ?? []);
    if (allFlights.length === 0) return null;

    // "전체" 선택 시 노선별 평균 LF, 특정 노선 선택 시 편명별 LF
    const routeLf = dashboardRoute === "전체"
      ? routes.map((r) => {
          const rFlights = flightsByRoute[r] ?? [];
          const avg = rFlights.length > 0
            ? Math.round(rFlights.reduce((s, f) => s + f.lf, 0) / rFlights.length * 10) / 10
            : 0;
          return { label: r, lf: avg };
        })
      : allFlights.map((f) => ({
          label: `${f.flightNo} (${f.time})`,
          lf: f.lf,
        }));

    // 등급별 LF 집계
    const classMap: Record<string, { sold: number; seats: number }> = {};
    const classLabelMap: Record<string, string> = {
      C: "C (프레스티지)", Y: "Y (일반 정상)", M: "M (일반 할인)", V: "V (특가)",
    };
    allFlights.forEach((f) => {
      f.classes.forEach((c) => {
        if (!classMap[c.code]) classMap[c.code] = { sold: 0, seats: 0 };
        classMap[c.code].sold += c.sold;
        classMap[c.code].seats += c.seats;
      });
    });
    const classLf = ["C", "Y", "M", "V"]
      .filter((code) => classMap[code])
      .map((code) => ({
        label: classLabelMap[code] ?? code,
        lf: classMap[code].seats > 0
          ? Math.round((classMap[code].sold / classMap[code].seats) * 1000) / 10
          : 0,
      }));

    // 평균 LF
    const avgLf = allFlights.length > 0
      ? Math.round(allFlights.reduce((s, f) => s + f.lf, 0) / allFlights.length * 10) / 10
      : 0;

    // 당일 수익 (좌석별 가격 × 판매 수량 합산)
    const todayRevenue = allFlights.reduce((sum, f) =>
      sum + f.classes.reduce((s, c) => s + c.sold * c.price, 0), 0);
    const todayBookings = allFlights.reduce((sum, f) =>
      sum + f.classes.reduce((s, c) => s + c.sold, 0), 0);

    // ── 대시보드 계산 로그 ──────────────────────────────────────────────────
    console.group(`[대시보드] 데이터 계산 — 노선: ${dashboardRoute}`);

    console.group('📋 편명별 L/F');
    console.table(
      allFlights.map((f) => ({
        편명: f.flightNo,
        출발시각: f.time,
        노선: f.route,
        'L/F (%)': f.lf,
        상태: f.status,
      }))
    );
    console.groupEnd();

    console.group('🎫 등급별 L/F (판매좌석 / 전체좌석)');
    console.table(
      ["C", "Y", "M", "V"]
        .filter((code) => classMap[code])
        .map((code) => {
          const { sold, seats } = classMap[code];
          const lf = seats > 0 ? Math.round(sold / seats * 1000) / 10 : 0;
          return {
            등급: classLabelMap[code] ?? code,
            판매좌석: sold,
            전체좌석: seats,
            'L/F (%)': lf,
            계산식: `${sold} / ${seats} × 100 = ${lf}%`,
          };
        })
    );
    console.groupEnd();

    console.group('💰 수익 계산 (편명별 클래스 가격 × 판매좌석)');
    allFlights.forEach((f) => {
      const flightRevenue = f.classes.reduce((s, c) => s + c.sold * c.price, 0);
      console.groupCollapsed(`  ${f.flightNo} → ₩${flightRevenue.toLocaleString()}`);
      console.table(
        f.classes.map((c) => ({
          클래스: c.code,
          가격: `₩${c.price.toLocaleString()}`,
          판매: c.sold,
          좌석: c.seats,
          소계: `₩${(c.sold * c.price).toLocaleString()}`,
          상태: c.status,
        }))
      );
      console.groupEnd();
    });
    console.groupEnd();

    console.group('✅ 최종 집계');
    console.log(`대상 편수:   ${allFlights.length}편 (${routes.join(', ')})`);
    console.log(`평균 L/F:    ${avgLf}%  (편명별 L/F 단순평균)`);
    console.log(`총 수익:     ₩${todayRevenue.toLocaleString()}`);
    console.log(`총 예약:     ${todayBookings.toLocaleString()}건`);
    console.groupEnd();

    console.groupEnd();
    // ───────────────────────────────────────────────────────────────────────

    return { routeLf, classLf, avgLf, todayRevenue, todayBookings };
  }, [flightsByRoute, dashboardRoute]);

  const totalRevenue = liveStats ? liveStats.todayRevenue || summary.total_revenue : summary.total_revenue;
  const totalBookings = liveStats ? liveStats.todayBookings || summary.total_bookings : summary.total_bookings;
  const avgLoadFactor = liveStats ? liveStats.avgLf || summary.avg_load_factor : summary.avg_load_factor;
  const pendingRecs = pendingRecsLive;
  const filteredHistory = summary.revenue_history;
  const loadFactorData = liveStats ? liveStats.routeLf : summary.route_lf;

  const classLfData = liveStats ? liveStats.classLf : summary.class_lf;
  const routeLabel = dashboardRoute === "전체" ? "국내선 전체" : dashboardRoute;
  const titleText = `${routeLabel} 판매현황 (최근 ${periodDays}일)`;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* 헤더 + 필터 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800">{titleText}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* 노선 필터 */}
          <select
            data-testid="dashboard-route-select"
            value={dashboardRoute}
            onChange={(e) => setDashboardRoute(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="전체">국내선 전체</option>
            {KE_DOMESTIC_ROUTES.map((r) => (
              <option key={r} value={r}>{r.replace("-", " ↔ ")}</option>
            ))}
          </select>
          {/* 기간 필터 */}
          <div className="flex rounded-lg overflow-hidden border border-slate-200">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                data-testid={`period-btn-${opt.value}`}
                onClick={() => setPeriodDays(opt.value)}
                className={`px-3 py-1.5 text-sm font-bold transition-colors ${
                  periodDays === opt.value
                    ? "text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
                style={periodDays === opt.value ? { backgroundColor: BRAND } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-cards">
        <KpiCard
          icon={<TrendingUp size={20} className="text-blue-600" />}
          label={`최근 ${periodDays}일 수익`}
          value={fmt(totalRevenue)}
          sub="원"
          color="blue"
          testId="kpi-revenue"
        />
        <KpiCard
          icon={<Users size={20} className="text-emerald-600" />}
          label="총 예약 건수"
          value={totalBookings.toLocaleString()}
          sub="건"
          color="emerald"
          testId="kpi-bookings"
        />
        <KpiCard
          icon={<Plane size={20} className="text-amber-600" />}
          label="평균 Load Factor"
          value={`${avgLoadFactor.toFixed(1)}%`}
          sub={routeLabel}
          color="amber"
          testId="kpi-lf"
        />
        <KpiCard
          icon={<AlertCircle size={20} className="text-rose-600" />}
          label="AI 승인 대기"
          value={String(pendingRecs)}
          sub="건"
          color="rose"
          testId="kpi-pending-recs"
        />
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 mb-4">
          수익 추이 ({routeLabel} · 최근 {periodDays}일)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={filteredHistory}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => fmt(Number(v))} tick={{ fontSize: 11 }} width={50} />
            <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`, "수익"]} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#revGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Load Factor by Flight */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" data-testid="lf-by-flight-chart">
          <h3 className="font-semibold text-gray-700 mb-4">
            {dashboardRoute === "전체" ? "노선별 평균 Load Factor" : `항공편별 Load Factor (${routeLabel})`}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={loadFactorData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={130} />
              <Tooltip formatter={(v) => [`${v}%`, "Load Factor"]} />
              <Bar dataKey="lf" radius={[0, 4, 4, 0]}>
                {loadFactorData.map((d, i) => (
                  <Cell key={i} fill={loadFactorColor(d.lf)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Class Avg LF */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" data-testid="lf-by-class-chart">
          <h3 className="font-semibold text-gray-700 mb-4">
            등급별 평균 LF ({routeLabel})
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={classLfData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={38} />
              <Tooltip formatter={(v) => [`${v}%`, "평균 LF"]} />
              <Bar dataKey="lf" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {classLfData.map((d, i) => (
                  <Cell key={i} fill={loadFactorColor(d.lf)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 justify-center text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />85%+</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />65–85%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />~65%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, color, testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  testId: string;
}) {
  const bg: Record<string, string> = {
    blue: "bg-blue-50",
    emerald: "bg-emerald-50",
    amber: "bg-amber-50",
    rose: "bg-rose-50",
  };
  return (
    <div className={`${bg[color]} rounded-xl p-4 border border-gray-100`} data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
