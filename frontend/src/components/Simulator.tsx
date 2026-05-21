import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { FlaskConical, TrendingUp, TrendingDown, RefreshCw, X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useSimulationStore, SIMULATOR_ROUTES } from "../stores/simulationStore";
import type { SimulationResultDTO } from "../types";

// 노선별 기준값 (미리보기용 — store와 동기화)
const ROUTE_BASE_UI: Record<string, { revenue: number; lf: number; demand: number }> = {
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

function SimulationResultModal({
  result,
  params,
  onClose,
}: {
  result: SimulationResultDTO;
  params: { route: string; fuelChangePercent: number; exchangeRatePercent: number; priceChangePercent: number };
  onClose: () => void;
}) {
  const revUp = result.expectedRevenueChange >= 0;
  const demandUp = result.expectedDemandChange >= 0;
  const severity =
    result.expectedRevenueChange <= -10
      ? "danger"
      : result.expectedRevenueChange >= 5
      ? "success"
      : "neutral";

  const severityStyle = {
    danger:  { bar: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200",    icon: <AlertTriangle size={18} className="text-red-500" /> },
    success: { bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle size={18} className="text-emerald-500" /> },
    neutral: { bar: "bg-violet-400", badge: "bg-violet-50 text-violet-700 border-violet-200", icon: <Info size={18} className="text-violet-500" /> },
  }[severity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`h-1.5 rounded-t-2xl ${severityStyle.bar}`} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {severityStyle.icon}
            <span className="font-bold text-gray-800 text-base">시뮬레이션 결과 요약</span>
            <span className="text-xs text-gray-400">{params.route}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 핵심 지표 */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="수익 변화"
              value={`${revUp ? "+" : ""}${result.expectedRevenueChange}%`}
              sub={`적정가 ${Math.round(result.optimalPriceRange.min / 10000).toLocaleString()}만 ~ ${Math.round(result.optimalPriceRange.max / 10000).toLocaleString()}만원`}
              positive={revUp}
            />
            <MetricCard
              label="수요 변화"
              value={`${demandUp ? "+" : ""}${result.expectedDemandChange}%`}
              sub="기준 대비 예상 예약 증감"
              positive={demandUp}
            />
            <MetricCard
              label="입력 조건"
              value={
                [
                  params.fuelChangePercent !== 0 && `유가 ${params.fuelChangePercent > 0 ? "+" : ""}${params.fuelChangePercent}%`,
                  params.exchangeRatePercent !== 0 && `환율 ${params.exchangeRatePercent > 0 ? "+" : ""}${params.exchangeRatePercent}%`,
                  params.priceChangePercent !== 0 && `운임 ${params.priceChangePercent > 0 ? "+" : ""}${params.priceChangePercent}%`,
                ]
                  .filter(Boolean)
                  .join(" / ") || "변화 없음"
              }
              sub=""
              neutral
            />
          </div>

          {/* 등급별 수요 영향 — 운임 조정이 있을 때만 표시 */}
          {params.priceChangePercent !== 0 ? (
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">
              등급별 가격탄력성 영향
              <span className="ml-2 text-xs font-normal text-gray-400">(IATA 단거리 아시아 국내선 기준)</span>
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="text-left px-4 py-2.5 font-medium">클래스</th>
                    <th className="text-right px-4 py-2.5 font-medium">탄력성</th>
                    <th className="text-right px-4 py-2.5 font-medium">수요 변화</th>
                    <th className="text-right px-4 py-2.5 font-medium">수익 변화</th>
                  </tr>
                </thead>
                <tbody>
                  {result.classSummary.map((cls) => (
                    <tr key={cls.classCode} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-700">
                        <span className="inline-block w-6 h-6 rounded text-center leading-6 bg-violet-100 text-violet-700 font-bold mr-2">
                          {cls.classCode}
                        </span>
                        {cls.tier}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{cls.elasticity}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${cls.demandChangePct > 0 ? "text-emerald-600" : cls.demandChangePct < 0 ? "text-red-500" : "text-gray-400"}`}>
                        {cls.demandChangePct > 0 ? "+" : ""}{cls.demandChangePct}%
                      </td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${cls.revenueChangePct > 0 ? "text-emerald-600" : cls.revenueChangePct < 0 ? "text-red-500" : "text-gray-400"}`}>
                        {cls.revenueChangePct > 0 ? "+" : ""}{cls.revenueChangePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-400">
            <Info size={14} />
            등급별 탄력성 영향은 <span className="font-semibold text-gray-500 mx-1">자사 운임 조정</span> 슬라이더를 0 이외로 설정할 때 표시됩니다.
          </div>
          )}

          {/* RM 권고 */}
          <div className={`flex gap-3 p-4 rounded-xl border ${severityStyle.badge}`}>
            <div className="mt-0.5 shrink-0">{severityStyle.icon}</div>
            <div>
              <div className="text-xs font-bold mb-1">RM 권고사항</div>
              <div className="text-xs leading-relaxed">{result.rmRecommendation}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, sub, positive, neutral,
}: {
  label: string; value: string; sub: string; positive?: boolean; neutral?: boolean;
}) {
  const color = neutral
    ? "text-gray-700"
    : positive
    ? "text-emerald-600"
    : "text-red-500";
  return (
    <div className="bg-gray-50 rounded-xl p-3.5">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color} leading-tight`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Simulator() {
  const { params, result, isRunning, showModal, setParams, runSimulation, reset, closeModal } = useSimulationStore();

  const base = ROUTE_BASE_UI[params.route] ?? ROUTE_BASE_UI["국내선 전체"];
  const previewRevenue = base.revenue * (1 + (result?.expectedRevenueChange ?? 0) / 100);
  const previewLf = base.lf + (result?.expectedDemandChange ?? 0) * 0.8;
  const previewDemand = base.demand * (1 + (result?.expectedDemandChange ?? 0) / 100);
  const revDiff = Math.round(previewRevenue - base.revenue);
  const lfDiff = Math.round(previewLf - base.lf);
  const demandDiff = Math.round(previewDemand - base.demand);

  return (
    <div className="space-y-6" data-testid="simulator-page">
      {showModal && result && (
        <SimulationResultModal result={result} params={params} onClose={closeModal} />
      )}
      <div className="flex items-center gap-2">
        <FlaskConical size={20} className="text-violet-500" />
        <h2 className="text-xl font-bold text-gray-800">시뮬레이션 (What-if Analysis)</h2>
      </div>

      {/* Fixed cost notice */}
      <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-xs text-violet-700">
        고정값: 기종 B737-900 · 항공기임차료 ₩420M/월 · CREW비용 ₩85M/월 · 공항사용료 ₩12,000/편
      </div>

      {/* Route selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-600 mb-2">노선 선택</div>
        <div className="flex flex-wrap gap-2" data-testid="route-selector">
          {SIMULATOR_ROUTES.map((r) => (
            <button
              key={r}
              data-testid={`route-btn-${r}`}
              onClick={() => setParams({ route: r })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                params.route === r
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-violet-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Variable 1: Oil */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="text-sm font-semibold text-gray-600 mb-3">유가 변동 (%)</div>
          <input
            data-testid="fuel-change-slider"
            type="range" min={-50} max={50} step={5}
            value={params.fuelChangePercent}
            onChange={(e) => setParams({ fuelChangePercent: Number(e.target.value) })}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>-50%</span>
            <span className={`font-bold text-base ${params.fuelChangePercent > 0 ? "text-red-600" : params.fuelChangePercent < 0 ? "text-blue-600" : "text-gray-500"}`}>
              {params.fuelChangePercent > 0 ? `+${params.fuelChangePercent}%` : `${params.fuelChangePercent}%`}
            </span>
            <span>+50%</span>
          </div>
        </div>

        {/* Variable 2: Exchange Rate */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="text-sm font-semibold text-gray-600 mb-3">환율 변동 (%)</div>
          <input
            data-testid="exchange-rate-slider"
            type="range" min={-30} max={30} step={5}
            value={params.exchangeRatePercent}
            onChange={(e) => setParams({ exchangeRatePercent: Number(e.target.value) })}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>-30%</span>
            <span className={`font-bold text-base ${params.exchangeRatePercent > 0 ? "text-red-600" : params.exchangeRatePercent < 0 ? "text-blue-600" : "text-gray-500"}`}>
              {params.exchangeRatePercent > 0 ? `+${params.exchangeRatePercent}%` : `${params.exchangeRatePercent}%`}
            </span>
            <span>+30%</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">환율 상승 시 해외여행 수요 일부 국내 전환, 항공기재 비용 증가 반영</p>
        </div>

        {/* Variable 3: Price */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="text-sm font-semibold text-gray-600 mb-3">자사 운임 조정 (%)</div>
          <input
            data-testid="price-change-slider"
            type="range" min={-50} max={50} step={5}
            value={params.priceChangePercent}
            onChange={(e) => setParams({ priceChangePercent: Number(e.target.value) })}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>-50%</span>
            <span className={`font-bold text-base ${params.priceChangePercent > 0 ? "text-red-600" : params.priceChangePercent < 0 ? "text-blue-600" : "text-gray-500"}`}>
              {params.priceChangePercent > 0 ? `+${params.priceChangePercent}%` : `${params.priceChangePercent}%`}
            </span>
            <span>+50%</span>
          </div>
        </div>
      </div>

      {/* Predicted result preview */}
      <div className="grid grid-cols-3 gap-4" data-testid="result-preview">
        <ResultCard
          label="예상 수익 (일평균)"
          base={`${Math.round(base.revenue / 10000).toLocaleString()}만원`}
          predicted={`${Math.round(previewRevenue / 10000).toLocaleString()}만원`}
          diff={revDiff}
          unit="원"
        />
        <ResultCard
          label="예상 Load Factor"
          base={`${base.lf}%`}
          predicted={`${Math.min(100, Math.max(0, Math.round(previewLf)))}%`}
          diff={lfDiff}
          unit="%p"
        />
        <ResultCard
          label="예상 일일 예약"
          base={`${base.demand.toLocaleString()}건`}
          predicted={`${Math.max(0, Math.round(previewDemand)).toLocaleString()}건`}
          diff={demandDiff}
          unit="건"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          data-testid="run-simulation-btn"
          onClick={() => runSimulation()}
          disabled={isRunning}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {isRunning
            ? <><RefreshCw size={16} className="animate-spin" />실행 중...</>
            : <><FlaskConical size={16} />시뮬레이션 실행</>}
        </button>
        <button
          data-testid="reset-simulation-btn"
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={15} />초기화
        </button>
      </div>

      {/* Chart output */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="simulation-charts">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">월별 수익 비교 (기준 vs 시뮬레이션)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={result.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={45} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`]} />
                <Legend />
                <Bar dataKey="baseline" name="기준" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="simulation" name="시뮬레이션" fill="#7c3aed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Load Factor 추이</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={result.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, "Load Factor"]} />
                <ReferenceLine y={base.lf} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "기준", position: "right", fontSize: 11 }} />
                <Line type="monotone" dataKey="lf" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }} name="예상 LF" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!result && (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100" data-testid="simulation-empty-state">
          <FlaskConical size={36} className="mx-auto mb-2 opacity-25" />
          <p className="text-sm">변수를 조정하고 시뮬레이션 실행 버튼을 눌러주세요.</p>
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, base, predicted, diff, unit }: {
  label: string; base: string; predicted: string; diff: number; unit: string;
}) {
  const up = diff > 0;
  const same = diff === 0;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="text-xs text-gray-400 mb-2">{label}</div>
      <div className="flex items-end gap-2">
        <div className="text-gray-400 text-sm line-through">{base}</div>
        <div className="text-xl font-bold text-gray-800">{predicted}</div>
      </div>
      <div className={`flex items-center gap-1 mt-1 text-sm font-semibold ${same ? "text-gray-400" : up ? "text-red-500" : "text-blue-500"}`}>
        {!same && (up ? <TrendingUp size={14} /> : <TrendingDown size={14} />)}
        {same ? "변화 없음" : `${up ? "+" : ""}${diff.toLocaleString()}${unit}`}
      </div>
    </div>
  );
}
