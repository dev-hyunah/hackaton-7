import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { FileText, Download, Mail, TrendingUp, Target, Award, RefreshCw } from "lucide-react";
import { useReportStore } from "../stores/reportStore";
import { KE_DOMESTIC_ROUTES } from "../data/mockData";

export default function Report() {
  const {
    reportData, reportStatus, emailInput,
    setEmailInput, generateReport, downloadPdf, downloadDocx, sendEmail,
  } = useReportStore();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState("2026-05-01");
  const [periodEnd, setPeriodEnd] = useState("2026-05-31");
  const [emailSent, setEmailSent] = useState(false);

  const handleGenerate = () => {
    generateReport(selectedRoute, periodStart, periodEnd);
  };

  const handleEmail = async () => {
    if (!reportData || !emailInput.trim()) return;
    const ok = await sendEmail(reportData.reportId, emailInput);
    if (ok) {
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    }
  };

  return (
    <div className="space-y-6" data-testid="report-page">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <FileText size={16} className="text-emerald-600" />
          보고서 생성
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">노선 (전체: 비어있으면 전 노선)</label>
            <select
              data-testid="report-route-select"
              value={selectedRoute ?? ""}
              onChange={(e) => setSelectedRoute(e.target.value || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="">전체 노선</option>
              {KE_DOMESTIC_ROUTES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">기간 시작</label>
            <input
              data-testid="period-start-input"
              type="date" value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">기간 종료</label>
            <input
              data-testid="period-end-input"
              type="date" value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
        <button
          data-testid="generate-report-btn"
          onClick={handleGenerate}
          disabled={reportStatus === "generating"}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {reportStatus === "generating"
            ? <><RefreshCw size={15} className="animate-spin" />생성 중...</>
            : <><FileText size={15} />보고서 생성</>}
        </button>
      </div>

      {reportData && reportStatus === "ready" && (
        <>
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              data-testid="download-pdf-btn"
              onClick={() => void downloadPdf(reportData.reportId)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Download size={15} />PDF 다운로드
            </button>
            <button
              data-testid="download-docx-btn"
              onClick={() => downloadDocx(reportData.reportId)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-blue-300 transition-colors"
            >
              <Download size={15} />DOCX 다운로드
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <input
                data-testid="email-input"
                type="email" value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="이메일 주소"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <button
                data-testid="send-email-btn"
                onClick={handleEmail}
                disabled={!emailInput.trim()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-40 ${
                  emailSent
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
                }`}
              >
                <Mail size={15} />
                {emailSent ? "전송 완료 ✓" : "이메일 전송"}
              </button>
            </div>
          </div>

          {/* Report preview */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="report-preview">
            {/* Report header */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-8 py-6">
              <div className="text-xs opacity-70 mb-1">REVENUE MANAGEMENT REPORT</div>
              <h3 className="text-2xl font-bold">Yield Management Report</h3>
              <div className="text-sm opacity-80 mt-1">
                {reportData.periodStart} ~ {reportData.periodEnd} · {reportData.route ?? "국내선 전체 노선"}
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Executive Summary */}
              <section>
                <h4 className="text-base font-bold text-gray-700 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                  <Award size={16} className="text-blue-600" />Executive Summary
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <SummaryCard
                    label="총 수익"
                    value={`${(reportData.totalRevenue / 100_000_000).toFixed(2)}억원`}
                    sub={`목표 ${(reportData.totalTarget / 100_000_000).toFixed(2)}억원`}
                    highlight={reportData.achieveRate >= 100}
                  />
                  <SummaryCard
                    label="목표 달성률"
                    value={`${reportData.achieveRate}%`}
                    sub={reportData.achieveRate >= 100 ? "목표 초과 달성 ✓" : "목표 미달"}
                    highlight={reportData.achieveRate >= 100}
                  />
                  <SummaryCard
                    label="AI 가격 수익 기여"
                    value={`+${((reportData.totalRevenue - 430_000_000) / 1_000_000).toFixed(0)}M원`}
                    sub={`수동 승인 ${reportData.aiStats.approvedCount}건 적용분`}
                    highlight
                  />
                </div>
              </section>

              {/* Route performance */}
              <section>
                <h4 className="text-base font-bold text-gray-700 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                  <Target size={16} className="text-emerald-600" />노선별 수익 달성률
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reportData.routePerformance} margin={{ top: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="route" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(0)}M`} tick={{ fontSize: 11 }} width={45} />
                    <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`]} />
                    <Bar dataKey="target" name="목표" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="revenue" name="실적" radius={[3, 3, 0, 0]}>
                      {reportData.routePerformance.map((r, i) => (
                        <Cell key={i} fill={r.revenue >= r.target ? "#10b981" : "#f59e0b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {reportData.routePerformance.map((r) => {
                    const rate = Math.round((r.revenue / r.target) * 100);
                    const over = rate >= 100;
                    return (
                      <div key={r.route} className="flex items-center gap-3 text-sm">
                        <span className="w-20 font-medium text-gray-700">{r.route}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${over ? "bg-emerald-500" : "bg-amber-400"}`}
                            style={{ width: `${Math.min(100, rate)}%` }}
                          />
                        </div>
                        <span className={`w-12 text-right font-semibold ${over ? "text-emerald-600" : "text-amber-600"}`}>{rate}%</span>
                        <span className="text-gray-400 text-xs w-12">LF {r.loadFactor}%</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Yield trend */}
              <section>
                <h4 className="text-base font-bold text-gray-700 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-violet-600" />월별 Yield 추이
                </h4>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={reportData.yieldTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis domain={[60, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`]} />
                    <Bar dataKey="target" name="목표 Yield" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="yield" name="실제 Yield" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </section>

              {/* AI contribution */}
              <section>
                <h4 className="text-base font-bold text-gray-700 border-b border-gray-100 pb-2 mb-4">AI 가격 추천 수익 기여도</h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="text-2xl font-bold text-emerald-600" data-testid="ai-approved-count">{reportData.aiStats.approvedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">수동 승인</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="text-2xl font-bold text-red-400" data-testid="ai-rejected-count">{reportData.aiStats.rejectedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">거부</div>
                  </div>
                </div>
                <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm text-blue-800">
                  <span className="font-bold">수익 최적화 결론:</span> AI 추천 수동 승인 {reportData.aiStats.approvedCount}건으로 기준 대비 수익 약{" "}
                  <span className="font-bold text-blue-700">
                    +{((reportData.totalRevenue - 430_000_000) / 430_000_000 * 100).toFixed(1)}%
                  </span>{" "}
                  향상. 목표 달성률 <span className="font-bold">{reportData.achieveRate}%</span>로{" "}
                  {reportData.achieveRate >= 100 ? "목표 초과 달성" : "목표 미달 — 하위 노선 단가 전략 재검토 필요"}.
                </div>
              </section>

              {/* Recent daily revenue */}
              <section>
                <h4 className="text-base font-bold text-gray-700 border-b border-gray-100 pb-2 mb-4">최근 8일 일별 수익</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">날짜</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium">수익</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium">예약 건수</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium">평균 단가</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.revenueHistory.map((d) => (
                        <tr key={d.date} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600">2026/{d.date}</td>
                          <td className="px-3 py-2 text-right font-mono font-medium text-gray-800">{d.revenue.toLocaleString()}원</td>
                          <td className="px-3 py-2 text-right text-gray-600">{d.bookings}건</td>
                          <td className="px-3 py-2 text-right text-gray-600">{Math.round(d.revenue / d.bookings).toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {reportStatus === "idle" && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100" data-testid="report-empty-state">
          <FileText size={36} className="mx-auto mb-2 opacity-25" />
          <p className="text-sm">노선과 기간을 선택한 후 보고서를 생성하세요.</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight }: {
  label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${highlight ? "text-emerald-700" : "text-gray-800"}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
