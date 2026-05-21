import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, Users, Plane, AlertCircle } from "lucide-react";
import { KE_DOMESTIC_ROUTES } from "../data/mockData";
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

// 노선별 수익 히스토리 데이터 (노선 변경 시 수익 추이 반영)
const ROUTE_REVENUE_HISTORY: Record<string, { date: string; revenue: number; bookings: number }[]> = {
  "전체": [
    { date: "5/14", revenue: 282_000_000, bookings: 2720 },
    { date: "5/15", revenue: 268_400_000, bookings: 2581 },
    { date: "5/16", revenue: 301_200_000, bookings: 2902 },
    { date: "5/17", revenue: 315_900_000, bookings: 3048 },
    { date: "5/18", revenue: 334_400_000, bookings: 3219 },
    { date: "5/19", revenue: 351_200_000, bookings: 3387 },
    { date: "5/20", revenue: 318_700_000, bookings: 3063 },
    { date: "5/21", revenue: 344_300_000, bookings: 3325 },
    { date: "5/22", revenue: 362_100_000, bookings: 3491 },
    { date: "5/23", revenue: 328_600_000, bookings: 3167 },
  ],
  "GMP-CJU": [
    { date: "5/14", revenue: 58_700_000, bookings: 563 },
    { date: "5/15", revenue: 44_300_000, bookings: 425 },
    { date: "5/16", revenue: 67_200_000, bookings: 648 },
    { date: "5/17", revenue: 72_400_000, bookings: 697 },
    { date: "5/18", revenue: 81_600_000, bookings: 789 },
    { date: "5/19", revenue: 88_200_000, bookings: 851 },
    { date: "5/20", revenue: 76_400_000, bookings: 736 },
    { date: "5/21", revenue: 82_400_000, bookings: 795 },
    { date: "5/22", revenue: 91_100_000, bookings: 879 },
    { date: "5/23", revenue: 79_300_000, bookings: 765 },
  ],
  "GMP-PUS": [
    { date: "5/14", revenue: 31_200_000, bookings: 298 },
    { date: "5/15", revenue: 27_800_000, bookings: 267 },
    { date: "5/16", revenue: 34_400_000, bookings: 330 },
    { date: "5/17", revenue: 38_100_000, bookings: 366 },
    { date: "5/18", revenue: 41_200_000, bookings: 396 },
    { date: "5/19", revenue: 44_600_000, bookings: 429 },
    { date: "5/20", revenue: 39_100_000, bookings: 376 },
    { date: "5/21", revenue: 42_300_000, bookings: 407 },
    { date: "5/22", revenue: 46_800_000, bookings: 450 },
    { date: "5/23", revenue: 40_100_000, bookings: 386 },
  ],
  "ICN-CJU": [
    { date: "5/14", revenue: 52_100_000, bookings: 501 },
    { date: "5/15", revenue: 48_600_000, bookings: 468 },
    { date: "5/16", revenue: 56_800_000, bookings: 547 },
    { date: "5/17", revenue: 61_200_000, bookings: 589 },
    { date: "5/18", revenue: 67_400_000, bookings: 649 },
    { date: "5/19", revenue: 71_900_000, bookings: 693 },
    { date: "5/20", revenue: 63_200_000, bookings: 609 },
    { date: "5/21", revenue: 68_900_000, bookings: 663 },
    { date: "5/22", revenue: 74_400_000, bookings: 717 },
    { date: "5/23", revenue: 65_700_000, bookings: 633 },
  ],
  "GMP-TAE": [
    { date: "5/14", revenue: 12_400_000, bookings: 119 },
    { date: "5/15", revenue: 10_800_000, bookings: 103 },
    { date: "5/16", revenue: 13_700_000, bookings: 132 },
    { date: "5/17", revenue: 15_200_000, bookings: 146 },
    { date: "5/18", revenue: 16_800_000, bookings: 162 },
    { date: "5/19", revenue: 18_100_000, bookings: 174 },
    { date: "5/20", revenue: 15_400_000, bookings: 148 },
    { date: "5/21", revenue: 16_900_000, bookings: 163 },
    { date: "5/22", revenue: 18_700_000, bookings: 180 },
    { date: "5/23", revenue: 15_900_000, bookings: 153 },
  ],
  "GMP-KWJ": [
    { date: "5/14", revenue: 10_200_000, bookings: 98 },
    { date: "5/15", revenue:  9_100_000, bookings: 87 },
    { date: "5/16", revenue: 11_400_000, bookings: 110 },
    { date: "5/17", revenue: 12_800_000, bookings: 123 },
    { date: "5/18", revenue: 13_900_000, bookings: 134 },
    { date: "5/19", revenue: 14_800_000, bookings: 142 },
    { date: "5/20", revenue: 12_600_000, bookings: 121 },
    { date: "5/21", revenue: 13_700_000, bookings: 132 },
    { date: "5/22", revenue: 15_200_000, bookings: 146 },
    { date: "5/23", revenue: 13_100_000, bookings: 126 },
  ],
  "ICN-PUS": [
    { date: "5/14", revenue: 28_900_000, bookings: 278 },
    { date: "5/15", revenue: 26_100_000, bookings: 251 },
    { date: "5/16", revenue: 31_800_000, bookings: 306 },
    { date: "5/17", revenue: 34_600_000, bookings: 333 },
    { date: "5/18", revenue: 38_200_000, bookings: 368 },
    { date: "5/19", revenue: 41_100_000, bookings: 396 },
    { date: "5/20", revenue: 35_800_000, bookings: 345 },
    { date: "5/21", revenue: 39_200_000, bookings: 378 },
    { date: "5/22", revenue: 43_500_000, bookings: 419 },
    { date: "5/23", revenue: 37_400_000, bookings: 360 },
  ],
  "GMP-KPO": [
    { date: "5/14", revenue:  9_800_000, bookings: 94 },
    { date: "5/15", revenue:  8_600_000, bookings: 82 },
    { date: "5/16", revenue: 10_900_000, bookings: 105 },
    { date: "5/17", revenue: 12_300_000, bookings: 118 },
    { date: "5/18", revenue: 13_400_000, bookings: 129 },
    { date: "5/19", revenue: 14_300_000, bookings: 138 },
    { date: "5/20", revenue: 12_100_000, bookings: 116 },
    { date: "5/21", revenue: 13_200_000, bookings: 127 },
    { date: "5/22", revenue: 14_600_000, bookings: 141 },
    { date: "5/23", revenue: 12_500_000, bookings: 120 },
  ],
  "GMP-RSU": [
    { date: "5/14", revenue:  8_400_000, bookings: 80 },
    { date: "5/15", revenue:  7_200_000, bookings: 69 },
    { date: "5/16", revenue:  9_300_000, bookings: 89 },
    { date: "5/17", revenue: 10_600_000, bookings: 102 },
    { date: "5/18", revenue: 11_500_000, bookings: 111 },
    { date: "5/19", revenue: 12_400_000, bookings: 119 },
    { date: "5/20", revenue: 10_500_000, bookings: 101 },
    { date: "5/21", revenue: 11_400_000, bookings: 110 },
    { date: "5/22", revenue: 12_800_000, bookings: 123 },
    { date: "5/23", revenue: 10_900_000, bookings: 105 },
  ],
};

// 노선·기간별 KPI Mock 데이터
const ROUTE_PERIOD_KPI: Record<string, Record<number, { avgLf: number; pendingAi: number }>> = {
  "전체": { 1: { avgLf: 74.5, pendingAi: 3 }, 3: { avgLf: 72.1, pendingAi: 7 }, 7: { avgLf: 73.8, pendingAi: 14 }, 10: { avgLf: 71.6, pendingAi: 19 } },
  "GMP-CJU": { 1: { avgLf: 79.2, pendingAi: 1 }, 3: { avgLf: 77.4, pendingAi: 3 }, 7: { avgLf: 78.9, pendingAi: 5 }, 10: { avgLf: 76.3, pendingAi: 7 } },
  "GMP-PUS": { 1: { avgLf: 61.8, pendingAi: 1 }, 3: { avgLf: 59.2, pendingAi: 2 }, 7: { avgLf: 60.5, pendingAi: 4 }, 10: { avgLf: 58.7, pendingAi: 5 } },
  "ICN-CJU": { 1: { avgLf: 86.1, pendingAi: 1 }, 3: { avgLf: 84.3, pendingAi: 2 }, 7: { avgLf: 85.7, pendingAi: 4 }, 10: { avgLf: 83.2, pendingAi: 6 } },
  "GMP-TAE": { 1: { avgLf: 48.4, pendingAi: 0 }, 3: { avgLf: 46.8, pendingAi: 1 }, 7: { avgLf: 47.9, pendingAi: 2 }, 10: { avgLf: 45.6, pendingAi: 3 } },
  "GMP-KWJ": { 1: { avgLf: 52.3, pendingAi: 0 }, 3: { avgLf: 50.7, pendingAi: 1 }, 7: { avgLf: 51.8, pendingAi: 2 }, 10: { avgLf: 49.4, pendingAi: 3 } },
  "ICN-PUS": { 1: { avgLf: 61.2, pendingAi: 1 }, 3: { avgLf: 59.6, pendingAi: 2 }, 7: { avgLf: 60.8, pendingAi: 3 }, 10: { avgLf: 58.3, pendingAi: 4 } },
  "GMP-KPO": { 1: { avgLf: 55.1, pendingAi: 0 }, 3: { avgLf: 53.4, pendingAi: 1 }, 7: { avgLf: 54.6, pendingAi: 2 }, 10: { avgLf: 52.2, pendingAi: 2 } },
  "GMP-RSU": { 1: { avgLf: 49.3, pendingAi: 0 }, 3: { avgLf: 47.9, pendingAi: 1 }, 7: { avgLf: 49.1, pendingAi: 1 }, 10: { avgLf: 46.8, pendingAi: 2 } },
};

// 노선별 LF Mock 데이터 (노선 필터 반영용)
const ROUTE_LF_MAP: Record<string, { flight: { label: string; lf: number }[]; cls: { cls: string; lf: number }[] }> = {
  "전체": {
    flight: [
      { label: "KE1201 (GMP-CJU)", lf: 79 },
      { label: "KE1203 (GMP-CJU)", lf: 54 },
      { label: "KE1205 (GMP-CJU)", lf: 89 },
      { label: "KE1401 (GMP-PUS)", lf: 58 },
      { label: "KE1501 (ICN-CJU)", lf: 87 },
      { label: "KE1207 (GMP-CJU)", lf: 36 },
      { label: "KE1403 (GMP-PUS)", lf: 73 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 72 },
      { cls: "Y (일반 정상)", lf: 68 },
      { cls: "M (일반 할인)", lf: 81 },
      { cls: "V (특가)", lf: 55 },
    ],
  },
  "GMP-CJU": {
    flight: [
      { label: "KE1201", lf: 79 },
      { label: "KE1203", lf: 54 },
      { label: "KE1205", lf: 89 },
      { label: "KE1207", lf: 36 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 75 },
      { cls: "Y (일반 정상)", lf: 71 },
      { cls: "M (일반 할인)", lf: 85 },
      { cls: "V (특가)", lf: 58 },
    ],
  },
  "GMP-PUS": {
    flight: [
      { label: "KE1401", lf: 58 },
      { label: "KE1403", lf: 73 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 65 },
      { cls: "Y (일반 정상)", lf: 61 },
      { cls: "M (일반 할인)", lf: 74 },
      { cls: "V (특가)", lf: 49 },
    ],
  },
  "ICN-CJU": {
    flight: [
      { label: "KE1501", lf: 87 },
      { label: "KE1503", lf: 71 },
      { label: "KE1505", lf: 62 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 82 },
      { cls: "Y (일반 정상)", lf: 78 },
      { cls: "M (일반 할인)", lf: 89 },
      { cls: "V (특가)", lf: 71 },
    ],
  },
  "GMP-TAE": {
    flight: [
      { label: "KE1601", lf: 48 },
      { label: "KE1603", lf: 53 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 42 },
      { cls: "Y (일반 정상)", lf: 39 },
      { cls: "M (일반 할인)", lf: 51 },
      { cls: "V (특가)", lf: 35 },
    ],
  },
  "GMP-KWJ": {
    flight: [
      { label: "KE1701", lf: 52 },
      { label: "KE1703", lf: 57 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 48 },
      { cls: "Y (일반 정상)", lf: 44 },
      { cls: "M (일반 할인)", lf: 55 },
      { cls: "V (특가)", lf: 39 },
    ],
  },
  "ICN-PUS": {
    flight: [
      { label: "KE1801", lf: 61 },
      { label: "KE1803", lf: 66 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 57 },
      { cls: "Y (일반 정상)", lf: 53 },
      { cls: "M (일반 할인)", lf: 64 },
      { cls: "V (특가)", lf: 48 },
    ],
  },
  "GMP-KPO": {
    flight: [
      { label: "KE1901", lf: 55 },
      { label: "KE1903", lf: 59 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 51 },
      { cls: "Y (일반 정상)", lf: 47 },
      { cls: "M (일반 할인)", lf: 58 },
      { cls: "V (특가)", lf: 41 },
    ],
  },
  "GMP-RSU": {
    flight: [
      { label: "KE2001", lf: 49 },
      { label: "KE2003", lf: 53 },
    ],
    cls: [
      { cls: "C (프레스티지)", lf: 45 },
      { cls: "Y (일반 정상)", lf: 41 },
      { cls: "M (일반 할인)", lf: 52 },
      { cls: "V (특가)", lf: 36 },
    ],
  },
};

function getRouteData(route: string) {
  return ROUTE_LF_MAP[route] ?? ROUTE_LF_MAP["전체"];
}

function getRevenueHistory(route: string, days: number) {
  const history = ROUTE_REVENUE_HISTORY[route] ?? ROUTE_REVENUE_HISTORY["전체"];
  return history.slice(-days);
}

function getRoutePeriodKpi(route: string, days: number) {
  const kpiMap = ROUTE_PERIOD_KPI[route] ?? ROUTE_PERIOD_KPI["전체"];
  return kpiMap[days] ?? kpiMap[1];
}

export default function Dashboard() {
  const { recommendations } = useAiRecommendationStore();
  const [periodDays, setPeriodDays] = useState(1);
  const [dashboardRoute, setDashboardRoute] = useState("전체");

  const filteredHistory = getRevenueHistory(dashboardRoute, periodDays);

  const totalRevenue = filteredHistory.reduce((s, d) => s + d.revenue, 0);
  const totalBookings = filteredHistory.reduce((s, d) => s + d.bookings, 0);
  const kpi = getRoutePeriodKpi(dashboardRoute, periodDays);
  const pendingRecs = recommendations.filter((r) => r.status === "pending").length + kpi.pendingAi;
  const avgLoadFactor = kpi.avgLf / 100;

  const routeData = getRouteData(dashboardRoute);
  const { flight: loadFactorData, cls: classData } = routeData;

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
          value={`${(avgLoadFactor * 100).toFixed(1)}%`}
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
            항공편별 Load Factor ({routeLabel})
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

        {/* Load Factor by Booking Class */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" data-testid="lf-by-class-chart">
          <h3 className="font-semibold text-gray-700 mb-4">
            등급별 평균 LF ({routeLabel})
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={classData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="cls" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, "LF"]} />
              <Bar dataKey="lf" radius={[4, 4, 0, 0]}>
                {classData.map((d, i) => (
                  <Cell key={i} fill={loadFactorColor(d.lf)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="flex gap-4 mt-3 justify-center text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />85%+</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />65–85%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />~65%</span>
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
