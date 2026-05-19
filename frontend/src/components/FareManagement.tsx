import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Sparkles, Send, LayoutGrid, BarChart4,
  Coins, Wallet, XCircle,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  RefreshCw, Plane, CheckCircle, XIcon, Calendar,
} from "lucide-react";
import {
  buildDashboardFlights, KE_DOMESTIC_ROUTES,
  type DashboardFlight, type DashboardClass,
} from "../data/mockData";
import { useFareStore } from "../stores/fareStore";
import { useAiRecommendationStore } from "../stores/aiRecommendationStore";
import apiClient from "../api/apiClient";

const BRAND = "#002561";

const fmtW = (n: number) => `₩${n.toLocaleString()}`;


const classBarColor = (name: string) => {
  if (name.includes("프레스티지")) return "bg-amber-500";
  if (name.includes("정상"))       return "bg-blue-600";
  if (name.includes("할인"))       return "bg-cyan-500";
  return "bg-slate-400";
};
const statusBadgeClass = (s: DashboardFlight["status"]) => {
  const m: Record<string, string> = {
    "수요 급증": "bg-red-100 text-red-600",
    "매진임박":  "bg-orange-200 text-orange-700",
    "안정적":    "bg-green-100 text-green-700",
    "수요 저조": "bg-amber-100 text-amber-700",
  };
  return m[s] ?? "bg-slate-100 text-slate-500";
};
const lfBarColor = (lf: number) =>
  lf >= 90 ? "bg-red-500" : lf >= 70 ? "bg-amber-500" : "bg-[#002561]";

type ClassStatus = "Open" | "Closed" | "Sold Out";

interface EditState {
  flightId: string;
  classCode: string;
  field: "price" | "seats";
  value: string;
}

function buildWeekAroundDate(centerDate: string): { date: string; dayOfWeek: string; isToday: boolean; isPeak: boolean }[] {
  const dow = ["일", "월", "화", "수", "목", "금", "토"];
  const peakMonths = [1, 7, 8, 12];
  const center = new Date(centerDate);
  const todayStr = new Date().toISOString().slice(0, 10);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(center);
    d.setDate(center.getDate() - 3 + i);
    return {
      date: d.toISOString().slice(0, 10),
      dayOfWeek: dow[d.getDay()],
      isToday: d.toISOString().slice(0, 10) === todayStr,
      isPeak: peakMonths.includes(d.getMonth() + 1),
    };
  });
}

function buildMonthDays(year: number, month: number): { date: string; day: number; inMonth: boolean }[] {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: { date: string; day: number; inMonth: boolean }[] = [];
  const prevLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevLastDate - i;
    days.push({ date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, inMonth: false });
  }
  for (let d = 1; d <= lastDate; d++) {
    days.push({ date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, inMonth: true });
  }
  const remain = 42 - days.length;
  for (let d = 1; d <= remain; d++) {
    days.push({ date: `${year}-${String(month + 2).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, inMonth: false });
  }
  return days;
}

const MONTH_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DOW_KO = ["일","월","화","수","목","금","토"];

function aiSuggestionLabel(current: number, ai: number): { text: string; color: string } {
  if (ai > current * 1.02) return { text: "가격을 올리세요", color: "text-red-600" };
  if (ai < current * 0.98) return { text: "가격을 내리세요", color: "text-blue-600" };
  return { text: "유지", color: "text-slate-400" };
}

// 일반석 좌석 수 변경 시 AI 재배분 — 총 좌석 수 불변 원칙
// delta > 0 (증가): 다른 일반석 중 수익 기여가 낮은 쪽(가격×잔여석 최소)에서 차감
// delta < 0 (감소): 다른 일반석 중 수익 기여가 높은 쪽(가격×잔여석 최대)으로 이관
// 반환: { classes: DashboardClass[], error?: string }
function aiReallocateSeats(
  classes: DashboardClass[],
  targetCode: string,
  newSeats: number,
): { classes: DashboardClass[]; error?: string } {
  const target = classes.find(c => c.code === targetCode)!;
  const delta = newSeats - target.seats;
  if (delta === 0) return { classes };

  // 프레스티지 제외한 다른 일반석 후보
  const others = classes
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.code !== targetCode && !c.name.includes("프레스티지"));

  if (delta > 0) {
    // 좌석 늘림 → 다른 등급에서 delta만큼 차감
    // 이익극대화: 가격×잔여석(여유)이 가장 낮은 등급 우선 차감 (기회비용 최소)
    const candidates = others
      .map(({ c, i }) => ({ c, i, spare: c.seats - c.sold }))
      .filter(({ spare }) => spare > 0)
      .sort((a, b) => (a.c.price * a.spare) - (b.c.price * b.spare));

    const totalSpare = candidates.reduce((s, x) => s + x.spare, 0);
    if (totalSpare < delta) {
      return { classes, error: `감소 가능한 좌석이 부족합니다. 최대 ${totalSpare}석까지 늘릴 수 있습니다.` };
    }

    const updated = classes.map(c => ({ ...c }));
    updated[classes.findIndex(c => c.code === targetCode)].seats = newSeats;
    let remaining = delta;
    for (const { i, spare } of candidates) {
      if (remaining <= 0) break;
      const take = Math.min(spare, remaining);
      updated[i].seats -= take;
      if (updated[i].seats === updated[i].sold) updated[i] = { ...updated[i], status: "Sold Out" as const };
      remaining -= take;
    }
    // 변경 대상: seats > sold이면 Sold Out → Open 복구, seats === sold이면 Sold Out
    const tidx = updated.findIndex(c => c.code === targetCode);
    if (updated[tidx].seats > updated[tidx].sold && updated[tidx].status === "Sold Out") {
      updated[tidx] = { ...updated[tidx], status: "Open" as const };
    } else if (updated[tidx].seats === updated[tidx].sold) {
      updated[tidx] = { ...updated[tidx], status: "Sold Out" as const };
    }
    return { classes: updated };

  } else {
    // 좌석 줄임 → 다른 등급으로 |delta|만큼 이관
    // 이익극대화: 가격×잔여석이 가장 높은 등급으로 이관 (수익 기여 최대)
    const canDecrease = newSeats >= target.sold;
    if (!canDecrease) {
      return { classes, error: `판매된 좌석(${target.sold}석)보다 적게 줄일 수 없습니다.` };
    }

    const recipients = others
      .map(({ c, i }) => ({ c, i }))
      .filter(({ c }) => c.status !== "Sold Out")
      .sort((a, b) => (b.c.price * (b.c.seats - b.c.sold)) - (a.c.price * (a.c.seats - a.c.sold)));

    if (recipients.length === 0) {
      return { classes, error: "좌석을 이관할 수 있는 등급이 없습니다." };
    }

    const updated = classes.map(c => ({ ...c }));
    updated[classes.findIndex(c => c.code === targetCode)].seats = newSeats;
    if (newSeats === target.sold) {
      updated[classes.findIndex(c => c.code === targetCode)].status = "Sold Out";
    }
    // 가장 적합한 1개 등급에 전량 이관 (단순·명확)
    updated[recipients[0].i].seats += Math.abs(delta);
    if (updated[recipients[0].i].status === "Closed") {
      updated[recipients[0].i].status = "Open";
    }
    return { classes: updated };
  }
}

export default function FareManagement() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [calYear, setCalYear]           = useState(today.getFullYear());
  const [calMonth, setCalMonth]         = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(KE_DOMESTIC_ROUTES[0]);
  const [flights, setFlights]           = useState<DashboardFlight[]>(() =>
    buildDashboardFlights(KE_DOMESTIC_ROUTES[0])
  );
  const [selectedFlight, setSelectedFlight] = useState<DashboardFlight>(
    () => buildDashboardFlights(KE_DOMESTIC_ROUTES[0])[0]
  );
  const [editState, setEditState]       = useState<EditState | null>(null);
  const [aiQuery, setAiQuery]           = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiPopup, setAiPopup]           = useState<{ desc: string; recommendedPrice?: number } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmDone, setConfirmDone]   = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // 거부는 음영 없이 배지만 표시 — 편집은 여전히 허용
  const [rejectedClasses, setRejectedClasses] = useState<Set<string>>(new Set());
  // 확정으로 인해 AI 추천 영역만 조용히 숨기는 set (거부됨 배지 없음)
  const [confirmedClasses, setConfirmedClasses] = useState<Set<string>>(new Set());
  const [seatAlert, setSeatAlert] = useState<string | null>(null);
  const [step, setStep] = useState<"list" | "detail">("list");
  const aiRef = useRef<HTMLTextAreaElement>(null);
  const { updateFare } = useFareStore();
  const { approveRecommendation, rejectRecommendation } = useAiRecommendationStore();
  const [aiDetailPopup, setAiDetailPopup] = useState<{ flightId: string; cls: DashboardClass } | null>(null);
  // 주간 피커: 실제로 화면에 표시할 날짜(애니메이션 중엔 이전 날짜 유지)
  const [displayedDate, setDisplayedDate] = useState(todayStr);
  const [weekPhase, setWeekPhase] = useState<"idle" | "exit-left" | "exit-right" | "enter-left" | "enter-right">("idle");
  const weekAnimLock = useRef(false);

  const monthDays = buildMonthDays(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // exit → swap → enter 3단계 슬라이드 전환
  const changeDate = useCallback((newDate: string, direction?: "left" | "right") => {
    if (!direction || weekAnimLock.current) {
      setSelectedDate(newDate);
      setDisplayedDate(newDate);
      return;
    }
    weekAnimLock.current = true;
    // 1) exit: 현재 주 밀려나감
    setWeekPhase(direction === "left" ? "exit-left" : "exit-right");
    setTimeout(() => {
      // 2) 날짜 교체 (보이지 않는 동안)
      setSelectedDate(newDate);
      setDisplayedDate(newDate);
      setWeekPhase(direction === "left" ? "enter-right" : "enter-left");
      // 3) enter 완료 후 idle
      setTimeout(() => {
        setWeekPhase("idle");
        weekAnimLock.current = false;
      }, 280);
    }, 200);
  }, []);

  useEffect(() => {
    const newFlights = buildDashboardFlights(selectedRoute);
    setFlights(newFlights);
    setSelectedFlight(newFlights[0]);
    setRejectedClasses(new Set());
  }, [selectedRoute]);

  const syncSelected = (updated: DashboardFlight[]) => {
    const found = updated.find((f) => f.id === selectedFlight.id);
    if (found) setSelectedFlight(found);
  };

  const startEdit = (flightId: string, classCode: string, field: "price" | "seats", cur: number) => {
    setEditState({ flightId, classCode, field, value: String(cur) });
  };
  const commitEdit = () => {
    if (!editState) return;
    const num = parseInt(editState.value, 10);
    if (isNaN(num) || num < 0) { setEditState(null); return; }

    if (editState.field === "price") {
      const updated = flights.map((f) => {
        if (f.id !== editState.flightId) return f;
        return {
          ...f,
          classes: f.classes.map((c) => {
            if (c.code !== editState.classCode) return c;
            updateFare(editState.flightId, editState.classCode, num);
            return { ...c, price: num };
          }),
        };
      });
      setFlights(updated);
      syncSelected(updated);
      setEditState(null);
      return;
    }

    // 좌석 수 변경 — 총 좌석 불변 원칙, AI 재배분
    const flight = flights.find(f => f.id === editState.flightId);
    if (!flight) { setEditState(null); return; }
    const targetCls = flight.classes.find(c => c.code === editState.classCode);
    if (!targetCls) { setEditState(null); return; }

    // 프레스티지 좌석 수 변경 불가 (방어)
    if (targetCls.name.includes("프레스티지")) { setEditState(null); return; }

    const newSeats = Math.max(num, targetCls.sold); // sold 보다 작아질 수 없음
    const { classes: newClasses, error } = aiReallocateSeats(flight.classes, editState.classCode, newSeats);
    if (error) {
      setSeatAlert(error);
      setTimeout(() => setSeatAlert(null), 4000);
      setEditState(null);
      return;
    }

    const updated = flights.map((f) =>
      f.id !== editState.flightId ? f : { ...f, classes: newClasses }
    );
    setFlights(updated);
    syncSelected(updated);
    setEditState(null);
  };

  const runAi = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiClient.post<{ description: string; recommended_price?: number }>(
        "/recommendations/strategy",
        { issue_text: aiQuery, route: selectedRoute, flight_id: selectedFlight.id }
      );
      setAiPopup({ desc: res.description, recommendedPrice: res.recommended_price });
    } catch {
      const up = selectedFlight.aiRecommended > selectedFlight.currentPrice;
      setAiPopup({
        desc: `"${aiQuery}" 분석 결과 — 해당 이슈로 수요 변동 가능성이 감지되었습니다. ${up ? "하위 클래스 인벤토리 즉시 회수 및" : ""} ${selectedFlight.id} 운임을 ${fmtW(selectedFlight.aiRecommended)}으로 ${up ? "인상" : "조정"}하십시오.`,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiPopup = () => {
    const updated = flights.map((f) =>
      f.id === selectedFlight.id
        ? {
            ...f,
            currentPrice: f.aiRecommended,
            classes: f.classes.map((c) => ({
              ...c,
              price: c.aiPrice,
              status: c.name.includes("특가") ? ("Closed" as ClassStatus) : c.status,
            })),
          }
        : f
    );
    setFlights(updated);
    syncSelected(updated);
    setAiPopup(null);
    setAiQuery("");
  };

  const applyAiClass = (flightId: string, classCode: string) => {
    const updated = flights.map((f) => {
      if (f.id !== flightId) return f;
      return {
        ...f,
        classes: f.classes.map((c) =>
          c.code === classCode ? { ...c, price: c.aiPrice } : c
        ),
      };
    });
    setFlights(updated);
    syncSelected(updated);
  };

  // Open / Closed 전환 (좌석 이동 없음, Sold Out은 토글 불가)
  const toggleStatus = (flightId: string, classCode: string) => {
    const updated = flights.map((f) => {
      if (f.id !== flightId) return f;
      return {
        ...f,
        classes: f.classes.map((c) => {
          if (c.code !== classCode) return c;
          if (c.status === "Sold Out") return c;
          const next: ClassStatus = c.status === "Open" ? "Closed" : "Open";
          return { ...c, status: next };
        }),
      };
    });
    setFlights(updated);
    syncSelected(updated);
  };

  const handleRejectAi = (flightId: string, classCode: string) => {
    rejectRecommendation(`${flightId}-${classCode}`);
    setRejectedClasses(prev => new Set(prev).add(`${flightId}-${classCode}`));
    setAiDetailPopup(null);
  };

  const handleConfirmInventory = async () => {
    setConfirmLoading(true);
    setConfirmError(null);
    let hasError = false;
    try {
      for (const cls of selectedFlight.classes) {
        await apiClient.put(`/fares/${selectedFlight.id}`, {
          class_code: cls.code,
          new_price: cls.price,
          updated_by: "Revenue Manager",
        });
      }
    } catch (err: unknown) {
      hasError = true;
      const detail =
        err instanceof Error ? err.message : "백엔드 저장 중 오류가 발생했습니다.";
      setConfirmError(detail);
      setTimeout(() => setConfirmError(null), 4000);
    } finally {
      setConfirmLoading(false);
    }
    if (!hasError) {
      // 확정 시 미처리 AI 추천 영역만 조용히 숨김 (배지 없음)
      setConfirmedClasses(prev => {
        const next = new Set(prev);
        for (const cls of selectedFlight.classes) {
          if (cls.aiPrice !== cls.price) {
            next.add(`${selectedFlight.id}-${cls.code}`);
          }
        }
        return next;
      });
      setConfirmDone(true);
      setTimeout(() => setConfirmDone(false), 2500);
    }
  };

  const revenue = selectedFlight.classes.reduce((s, c) => s + c.sold * c.price, 0);
  const cost    = selectedFlight.baseCost;
  const profit  = revenue - cost;
  const margin  = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";
  const soldSeats = selectedFlight.classes.reduce((s, c) => s + c.sold, 0);

  // 선택 항공편에 미처리 AI 추천이 하나라도 있는지 여부
  const hasPendingAi = selectedFlight.classes.some(c => {
    const key = `${selectedFlight.id}-${c.code}`;
    return c.aiPrice !== c.price && !rejectedClasses.has(key) && !confirmedClasses.has(key);
  });

  return (
    <div className="space-y-0" data-testid="fare-management-page">

      {/* AI 추천 상세 모달 */}
      {aiDetailPopup && (() => {
        const { cls } = aiDetailPopup;
        const rejKey = `${aiDetailPopup.flightId}-${cls.code}`;
        const isUp = cls.aiPrice > cls.price;
        const pct = Math.round(Math.abs(cls.aiPrice - cls.price) / cls.price * 100);
        const soldPct = cls.seats > 0 ? Math.round(cls.sold / cls.seats * 100) : 0;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={() => setAiDetailPopup(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-xl text-purple-600"><Sparkles size={20} /></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-base">AI 추천 상세</h3>
                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                      {aiDetailPopup.flightId} · {cls.name} · {selectedRoute}
                    </p>
                  </div>
                </div>
                <button onClick={() => setAiDetailPopup(null)} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <XCircle size={22} />
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 mb-4">
                <div className="text-center">
                  <div className="text-[10px] text-slate-400 font-bold mb-1">현재 운임</div>
                  <div className="text-xl font-black text-slate-400 line-through">{cls.price.toLocaleString()}원</div>
                </div>
                <div className={`flex flex-col items-center gap-1 text-sm font-black ${isUp ? "text-red-500" : "text-blue-500"}`}>
                  {isUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  {isUp ? "+" : "-"}{pct}%
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-slate-400 font-bold mb-1">AI 추천 운임</div>
                  <div className={`text-xl font-black ${isUp ? "text-red-600" : "text-blue-600"}`}>
                    {cls.aiPrice.toLocaleString()}원
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={12} className="text-purple-500" />
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">AI 분석 근거</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{selectedFlight.reason}</p>
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                  <span>현재 판매율</span>
                  <span className="text-purple-600 font-black">{soldPct}% ({cls.sold}/{cls.seats}석)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all" style={{ width: `${soldPct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                  <span>잔여 {cls.seats - cls.sold}석</span>
                  <span className={`px-2 py-0.5 rounded-full ${cls.status === "Open" ? "bg-green-100 text-green-600" : cls.status === "Sold Out" ? "bg-red-200 text-red-700" : "bg-red-100 text-red-500"}`}>
                    {cls.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleRejectAi(aiDetailPopup.flightId, cls.code)}
                  className="flex-1 bg-slate-100 text-slate-500 py-3 rounded-xl font-black text-sm hover:bg-slate-200 transition-all"
                >
                  거부
                </button>
                <button
                  disabled={rejectedClasses.has(rejKey)}
                  onClick={() => {
                    applyAiClass(aiDetailPopup.flightId, cls.code);
                    approveRecommendation(rejKey);
                    setAiDetailPopup(null);
                  }}
                  className="flex-1 text-white py-3 rounded-xl font-black text-sm hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BRAND }}
                >
                  추천 운임 적용
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI 전략 분석 결과 모달 */}
      {aiPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={() => setAiPopup(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-6 py-4 flex justify-between items-center" style={{ background: "linear-gradient(135deg, #002561 0%, #0040a8 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.18)" }}>
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base tracking-tight">AI 긴급 전략 제안</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "#93c5fd" }}>External Factor Detected</p>
                </div>
              </div>
              <button onClick={() => setAiPopup(null)} className="transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6">
              {/* 분석 결과 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block w-1 h-4 rounded-full bg-sky-500"></span>
                  <span className="text-[11px] font-black text-sky-600 uppercase tracking-wider">분석 결과</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {aiPopup.desc.split(/(즉각|즉시|권고|인상|조정|회수|수요 변동|긴급|경고|주의|상승|감소|위험)/).map((part, i) =>
                    /(즉각|즉시|권고|인상|조정|회수|수요 변동|긴급|경고|주의|상승|감소|위험)/.test(part)
                      ? <mark key={i} className="not-italic rounded px-0.5" style={{ backgroundColor: "#fef3c7", color: "#b45309", fontWeight: 900 }}>{part}</mark>
                      : part
                  )}
                </p>
              </div>

              {/* 권고 운임 카드 */}
              {aiPopup.recommendedPrice && aiPopup.recommendedPrice > 0 && (
                <div className="rounded-xl p-4 mb-5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)", border: "1px solid #bae6fd" }}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: "#0284c7" }}>권고 적용 운임</p>
                    <p className="text-2xl font-black" style={{ color: "#002561" }}>{fmtW(aiPopup.recommendedPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold mb-1 text-slate-400">현재 운임 대비</p>
                    <p className={`text-lg font-black ${aiPopup.recommendedPrice > selectedFlight.currentPrice ? "text-red-500" : "text-emerald-500"}`}>
                      {aiPopup.recommendedPrice > selectedFlight.currentPrice ? "▲" : "▼"}
                      {" "}{Math.abs(Math.round((aiPopup.recommendedPrice / selectedFlight.currentPrice - 1) * 100))}%
                    </p>
                  </div>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-3">
                <button
                  data-testid="strategy-reject-btn"
                  onClick={() => setAiPopup(null)}
                  className="flex-1 py-3 rounded-xl font-black text-sm transition-all"
                  style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                >
                  기각
                </button>
                <button
                  data-testid="strategy-approve-btn"
                  onClick={applyAiPopup}
                  className="flex-1 text-white py-3 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  style={{ backgroundColor: BRAND }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <CheckCircle size={15} />
                  전략 승인 및 적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 좌석 수 변경 불가 알림 */}
      {seatAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce-once">
          <XCircle size={16} /> {seatAlert}
        </div>
      )}

      {/* 주간 피커 슬라이드 CSS */}
      <style>{`
        @keyframes weekExitLeft  { from{opacity:1;transform:translateX(0)}   to{opacity:0;transform:translateX(-40px)} }
        @keyframes weekExitRight { from{opacity:1;transform:translateX(0)}   to{opacity:0;transform:translateX(40px)}  }
        @keyframes weekEnterLeft { from{opacity:0;transform:translateX(40px)}  to{opacity:1;transform:translateX(0)}  }
        @keyframes weekEnterRight{ from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)}  }
        .week-exit-left  { animation: weekExitLeft  0.18s cubic-bezier(.4,0,1,1)   both; }
        .week-exit-right { animation: weekExitRight 0.18s cubic-bezier(.4,0,1,1)   both; }
        .week-enter-left { animation: weekEnterLeft  0.26s cubic-bezier(0,.5,.3,1) both; }
        .week-enter-right{ animation: weekEnterRight 0.26s cubic-bezier(0,.5,.3,1) both; }
      `}</style>

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto grid grid-cols-12 gap-4 sm:gap-5 pb-8">

        {/* ── 좌측 사이드바 — 항상 렌더, 모바일도 col-span-12 ── */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">

          {/* 노선 · 날짜 설정 */}
          <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-black text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Search size={13} /> 노선 및 일자 설정
            </h2>
            <div className="space-y-3">
              <select
                data-testid="fare-route-select"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                {KE_DOMESTIC_ROUTES.map((r) => (
                  <option key={r} value={r}>{r.replace("-", " ↔ ")}</option>
                ))}
              </select>

              {/* 날짜 선택 토글 */}
              <button
                onClick={() => setShowCalendar((v) => !v)}
                className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Calendar size={14} className="text-blue-500" />
                  {selectedDate}
                </span>
                <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 ${showCalendar ? "rotate-90" : ""}`} />
              </button>

              {/* 월간 달력 */}
              {showCalendar && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-md">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-200 text-slate-500"><ChevronLeft size={14} /></button>
                    <span className="text-xs font-black text-slate-700">{calYear}년 {MONTH_KO[calMonth]}</span>
                    <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-200 text-slate-500"><ChevronRight size={14} /></button>
                  </div>
                  <div className="grid grid-cols-7 text-center border-b border-slate-100">
                    {DOW_KO.map((d, i) => (
                      <div key={d} className={`text-[9px] font-black py-1.5 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-500" : "text-slate-400"}`}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthDays.map((d, i) => {
                      const isSelected = selectedDate === d.date;
                      const isToday = d.date === todayStr;
                      const dow = i % 7;
                      return (
                        <button
                          key={d.date}
                          onClick={() => { if (d.inMonth) { changeDate(d.date); setShowCalendar(false); } }}
                          disabled={!d.inMonth}
                          className={`py-1.5 text-[10px] font-bold transition-all
                            ${!d.inMonth ? "text-slate-200 cursor-default" : ""}
                            ${d.inMonth && !isSelected ? "hover:bg-blue-50" : ""}
                            ${isSelected ? "text-white rounded-sm" : ""}
                            ${isToday && !isSelected ? "underline" : ""}
                            ${d.inMonth && dow === 0 && !isSelected ? "text-red-400" : ""}
                            ${d.inMonth && dow === 6 && !isSelected ? "text-blue-500" : ""}
                          `}
                          style={isSelected ? { backgroundColor: BRAND } : {}}
                        >
                          {d.day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 주간 피커 — exit/enter 슬라이드 전환 */}
              <div className="overflow-hidden rounded-lg">
                <div className={`grid grid-cols-7 gap-1 ${
                  weekPhase === "exit-left"   ? "week-exit-left"   :
                  weekPhase === "exit-right"  ? "week-exit-right"  :
                  weekPhase === "enter-left"  ? "week-enter-left"  :
                  weekPhase === "enter-right" ? "week-enter-right" : ""
                }`}>
                  {buildWeekAroundDate(displayedDate).map((d, idx) => {
                    const isSelected = selectedDate === d.date;
                    const isCenter = idx === 3;
                    return (
                      <button
                        key={d.date}
                        onClick={() => {
                          const dir = idx < 3 ? "right" : idx > 3 ? "left" : undefined;
                          changeDate(d.date, dir);
                        }}
                        className={`flex flex-col items-center py-2 rounded-lg text-[10px] font-black border transition-colors duration-150 ${
                          isSelected
                            ? "text-white border-[#002561]"
                            : isCenter && !isSelected
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : d.isToday
                            ? "bg-blue-50 border-blue-200 text-blue-700"
                            : "bg-white border-slate-100 text-slate-500 hover:border-blue-300"
                        }`}
                        style={isSelected ? { backgroundColor: BRAND } : {}}
                      >
                        <span className="text-[8px] opacity-70">{d.dayOfWeek}</span>
                        <span>{d.date.slice(8)}</span>
                        {d.isPeak && <span className="text-[7px] text-amber-500 font-bold">성수기</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 font-medium">
                📅 {selectedDate} · {selectedRoute}
              </div>
            </div>
          </div>

          {/* AI 전략 분석 요청 */}
          <div className="rounded-xl shadow-lg text-white p-4 sm:p-5" style={{ backgroundColor: BRAND }}>
            <h2 className="text-sm font-black mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-sky-300" /> AI 전략 분석 요청
            </h2>
            <div className="space-y-3">
              <textarea
                data-testid="ai-strategy-query"
                ref={aiRef}
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="w-full h-20 p-3 bg-white/10 border border-white/20 rounded-lg text-xs placeholder:text-white/40 focus:bg-white/20 focus:outline-none resize-none font-medium"
                placeholder="돌발 이슈를 입력하세요&#10;(예: 태풍 보도, 대형 행사, 연휴 등)"
              />
              <button
                data-testid="ai-strategy-submit-btn"
                onClick={runAi}
                disabled={aiLoading || !aiQuery.trim()}
                className="w-full bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-[#002561] font-black py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {aiLoading
                  ? <><RefreshCw size={13} className="animate-spin" /> 분석 중...</>
                  : <><Send size={13} /> AI 전략 분석 시작</>}
              </button>
            </div>
          </div>

        </aside>

        {/* ── 중앙 메인 ── */}
        <section className="col-span-12 lg:col-span-6 space-y-4">

          {step === "list" ? (
            /* ── step 1: 운항 현황 테이블 ── */
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-end flex-wrap gap-2">
                <div>
                  <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
                    {selectedDate} 운항 현황
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                    {selectedFlight.aircraft} ({selectedFlight.totalSeats}석) · {selectedRoute}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase">Selected</span>
                  <span className="text-sm sm:text-lg font-black" style={{ color: BRAND }}>
                    {selectedFlight.id} / {selectedFlight.time}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-4 sm:px-5 py-3">편명/시간</th>
                      <th className="px-4 sm:px-5 py-3 text-center">L/F</th>
                      <th className="px-4 sm:px-5 py-3 text-center">Pace</th>
                      <th className="px-4 sm:px-5 py-3 text-blue-600">AI 추천</th>
                      <th className="px-4 sm:px-5 py-3">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {flights.map((f) => {
                      const isSelected = f.id === selectedFlight.id;
                      const paceUp = f.pace.startsWith("+");
                      const aiLabel = aiSuggestionLabel(f.currentPrice, f.aiRecommended);
                      return (
                        <tr
                          key={f.id}
                          onClick={() => { setSelectedFlight(f); setStep("detail"); }}
                          className={`cursor-pointer transition-all hover:bg-blue-50/60 ${
                            isSelected ? "bg-blue-50/80 border-l-4 border-[#002561]" : "border-l-4 border-transparent"
                          }`}
                        >
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <div className="font-black text-slate-900 text-sm">{f.id}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{f.time} ({f.timeSlot})</div>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-14 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full ${lfBarColor(f.lf)}`} style={{ width: `${f.lf}%` }} />
                              </div>
                              <span className="text-[11px] font-black text-slate-600">{f.lf}%</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4 text-center">
                            <span className={`text-[11px] font-black flex items-center justify-center gap-0.5 ${paceUp ? "text-red-500" : "text-blue-500"}`}>
                              {paceUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                              {f.pace}
                            </span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4 font-black text-[12px]">
                            <span className={aiLabel.color}>{aiLabel.text}</span>
                          </td>
                          <td className="px-4 sm:px-5 py-3 sm:py-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadgeClass(f.status)}`}>
                              {f.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── step 2: 세부 현황 (좌석 배치도 + 등급 카드) ── */
            <>
              {/* 뒤로가기 + 편명 헤더 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
                <button
                  onClick={() => setStep("list")}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-[#002561] font-black text-sm transition-colors"
                >
                  <ChevronLeft size={18} /> 운항 목록
                </button>
                <div className="h-5 w-px bg-slate-200" />
                <div>
                  <span className="font-black text-slate-800 text-sm">{selectedFlight.id}</span>
                  <span className="text-slate-400 text-xs font-bold ml-2">{selectedFlight.time} ({selectedFlight.timeSlot}) · {selectedFlight.aircraft}</span>
                </div>
                <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadgeClass(selectedFlight.status)}`}>
                  {selectedFlight.status}
                </span>
              </div>

              {/* 기내 좌석 배치도 */}
              <SeatMap flight={selectedFlight} />

              {/* 좌석 등급별 현황 카드 */}
              <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                    <LayoutGrid size={16} style={{ color: BRAND }} />
                    좌석 등급별 운임 관리
                    <span className="text-xs font-bold text-slate-400 ml-1 hidden sm:inline">
                      — {selectedFlight.id} ({selectedFlight.time})
                    </span>
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">
                    총 {selectedFlight.totalSeats} Seats
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {selectedFlight.classes.map((cls) => {
                    const rejKey = `${selectedFlight.id}-${cls.code}`;
                    const isRejected = rejectedClasses.has(rejKey);
                    const isConfirmed = confirmedClasses.has(rejKey);
                    return (
                      <ClassEditCard
                        key={cls.code}
                        cls={cls}
                        flightId={selectedFlight.id}
                        editState={editState}
                        isRejected={isRejected}
                        isConfirmed={isConfirmed}
                        onStartEdit={startEdit}
                        onCommit={commitEdit}
                        onCancel={() => setEditState(null)}
                        onEditChange={(v) => setEditState((e) => e ? { ...e, value: v } : null)}
                        onToggleStatus={toggleStatus}
                        onDetailAi={(fid, code) => {
                          const c = selectedFlight.classes.find(c => c.code === code);
                          if (c) setAiDetailPopup({ flightId: fid, cls: c });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── 우측: Profit Analysis ── */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm lg:sticky top-20">
            <h2 className="text-sm font-black text-slate-800 mb-5 flex items-center gap-2 border-b pb-3 uppercase">
              <BarChart4 size={16} style={{ color: BRAND }} /> Profit Analysis
            </h2>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase">Revenue</span>
                  <Coins size={13} className="text-blue-400" />
                </div>
                <div className="text-xl font-black" style={{ color: BRAND }}>{fmtW(revenue)}</div>
                <p className="text-[9px] text-blue-400 font-bold mt-1">
                  {soldSeats}석 판매 (L/F {selectedFlight.lf}%)
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Cost</span>
                  <Wallet size={13} className="text-slate-400" />
                </div>
                <div className="text-xl font-black text-slate-700">{fmtW(cost)}</div>
                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Operational Expenses</p>
              </div>
              <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-inner">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Margin</span>
                  <span className={`text-sm font-black ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {margin}%
                  </span>
                </div>
                <div className={`text-2xl font-black tracking-tight mb-3 ${profit >= 0 ? "text-slate-800" : "text-red-600"}`}>
                  {fmtW(profit)}
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${profit >= 0 ? "bg-green-500" : "bg-red-400"}`}
                    style={{ width: `${Math.min(Math.abs(Number(margin)), 100)}%` }}
                  />
                </div>
              </div>
              {hasPendingAi && (
                <>
                  {confirmError && (
                    <div className="mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
                      <XCircle size={13} className="shrink-0" />
                      <span>{confirmError}</span>
                    </div>
                  )}
                  <button
                    data-testid="confirm-inventory-btn"
                    onClick={handleConfirmInventory}
                    disabled={confirmLoading}
                    className={`w-full py-3 sm:py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-60 ${
                      confirmDone ? "bg-green-500 text-white" : confirmError ? "bg-red-500 text-white" : "text-white hover:opacity-90"
                    }`}
                    style={confirmDone || confirmError ? {} : { backgroundColor: BRAND }}
                  >
                    {confirmLoading
                      ? <><RefreshCw size={15} className="animate-spin" /> 저장 중...</>
                      : confirmDone
                      ? <><CheckCircle size={15} /> 저장 완료</>
                      : confirmError
                      ? <><XCircle size={15} /> 저장 실패</>
                      : <><Plane size={15} /> 인벤토리 실시간 통제 확정</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── 등급 카드 ─────────────────────────────────────────────────────────────────
function ClassEditCard({
  cls, flightId, editState, isRejected, isConfirmed, onStartEdit, onCommit, onCancel, onEditChange,
  onToggleStatus, onDetailAi,
}: {
  cls: DashboardClass;
  flightId: string;
  editState: EditState | null;
  isRejected: boolean;
  isConfirmed: boolean;
  onStartEdit: (fid: string, code: string, field: "price" | "seats", cur: number) => void;
  onCommit: () => void;
  onCancel: () => void;
  onEditChange: (v: string) => void;
  onToggleStatus: (fid: string, code: string) => void;
  onDetailAi: (fid: string, code: string) => void;
}) {
  const soldPct = cls.seats > 0 ? Math.round((cls.sold / cls.seats) * 100) : 0;
  const isEditingPrice = editState?.flightId === flightId && editState.classCode === cls.code && editState.field === "price";
  const isEditingSeats = editState?.flightId === flightId && editState.classCode === cls.code && editState.field === "seats";

  const isSoldOut  = cls.status === "Sold Out";
  const isClosed   = cls.status === "Closed";
  const isPrestige = cls.name.includes("프레스티지");

  // 운임 편집: Closed 시 잠금
  // 좌석 편집: 프레스티지만 잠금 / 일반석은 Open·Closed·Sold Out 모두 허용
  const priceLocked = isClosed;
  const seatsLocked = isPrestige;
  // 상태 토글: Sold Out은 불가
  const toggleLocked = isSoldOut;

  const statusColor =
    cls.status === "Open"     ? "bg-green-100 text-green-600" :
    cls.status === "Sold Out" ? "bg-red-200 text-red-700 cursor-not-allowed" :
                                "bg-red-100 text-red-600";

  const hasDiff = cls.aiPrice !== cls.price && !isRejected && !isConfirmed;
  const aiUp = cls.aiPrice > cls.price;
  const aiDiffPct = cls.price > 0 ? Math.round(((cls.aiPrice - cls.price) / cls.price) * 100) : 0;

  return (
    <div className={`p-4 rounded-xl border transition-all shadow-sm space-y-3 ${
      isSoldOut ? "bg-red-50 border-red-200"
      : isClosed ? "bg-orange-50 border-orange-200"
      : "bg-slate-50 border-slate-100 hover:border-blue-200"
    }`}>
      {/* 헤더 */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-sm font-black text-slate-800">{cls.name}</h4>
        </div>
        <button
          onClick={() => !toggleLocked && onToggleStatus(flightId, cls.code)}
          disabled={toggleLocked}
          className={`text-[10px] font-black px-2 py-0.5 rounded transition-all ${statusColor}`}
          title={isSoldOut ? "매진 — 상태 변경 불가" : "클릭하여 Open/Closed 전환"}
        >
          {cls.status}
        </button>
      </div>

      {/* 운임 편집 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase">현재 운임</span>
          {isEditingPrice ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editState!.value}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onCancel(); }}
                className="w-28 border border-blue-400 rounded px-2 py-1 text-right text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                autoFocus
              />
              <button onClick={onCommit} className="text-emerald-600 hover:text-emerald-700"><CheckCircle size={15} /></button>
              <button onClick={onCancel} className="text-red-400 hover:text-red-500"><XIcon size={15} /></button>
            </div>
          ) : (
            <button
              onClick={() => !priceLocked && onStartEdit(flightId, cls.code, "price", cls.price)}
              disabled={priceLocked}
              className={`font-mono font-black text-sm transition-colors ${
                priceLocked ? "text-slate-400 cursor-not-allowed" : "text-slate-800 hover:text-blue-600 underline decoration-dotted"
              }`}
              title={priceLocked ? "Closed 상태 — 운임 수정 불가" : "클릭하여 운임 수정"}
            >
              {fmtW(cls.price)}
            </button>
          )}
        </div>

        {/* AI 추천가 */}
        {hasDiff && (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-blue-500" />
              <span className="text-[10px] text-blue-600 font-bold">AI 추천</span>
              <span className={`text-[10px] font-black flex items-center gap-0.5 ${aiUp ? "text-red-500" : "text-blue-600"}`}>
                {aiUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {aiUp ? "+" : ""}{aiDiffPct}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-blue-700 text-xs">{fmtW(cls.aiPrice)}</span>
              <button
                onClick={() => onDetailAi(flightId, cls.code)}
                className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded font-bold hover:bg-purple-700 transition-colors"
              >
                상세 보기
              </button>
            </div>
          </div>
        )}

        {/* 거부 배지 */}
        {isRejected && (
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
            <XIcon size={11} className="text-slate-400" />
            <span className="text-[10px] text-slate-400 font-bold">AI 추천 거부됨 — 수동 편집 가능</span>
          </div>
        )}
      </div>

      {/* 좌석 수 편집 + 판매율 바 */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold items-center">
          <span className="text-slate-400">판매율 {soldPct}%</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">{cls.sold} /</span>
            {isEditingSeats ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={editState!.value}
                  onChange={(e) => onEditChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onCancel(); }}
                  className="w-14 border border-blue-400 rounded px-1 py-0.5 text-center text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-300"
                  autoFocus
                />
                <button onClick={onCommit} className="text-emerald-600"><CheckCircle size={13} /></button>
                <button onClick={onCancel} className="text-red-400"><XIcon size={13} /></button>
              </div>
            ) : (
              <button
                onClick={() => !seatsLocked && onStartEdit(flightId, cls.code, "seats", cls.seats)}
                disabled={seatsLocked}
                className={`font-black transition-colors ${
                  seatsLocked ? "text-slate-400 cursor-not-allowed" : "text-slate-600 hover:text-blue-600 underline decoration-dotted"
                }`}
                title={seatsLocked ? "프레스티지 좌석 수 변경 불가" : "클릭하여 좌석 수 수정 (AI 자동 재배분)"}
              >
                {cls.seats}석
              </button>
            )}
          </div>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${classBarColor(cls.name)}`}
            style={{ width: `${soldPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── 기내 좌석 배치도 ──────────────────────────────────────────────────────────
function SeatMap({ flight }: { flight: DashboardFlight }) {
  const [hoveredSeat, setHoveredSeat] = useState<{ cls: string; seatId: string; sold: boolean } | null>(null);

  // 클래스별 색상
  const clsColor = (name: string, sold: boolean, status: string) => {
    const opacity = status === "Closed" ? "opacity-40" : "";
    if (status === "Sold Out" || sold) {
      if (name.includes("프레스티지")) return `bg-amber-500 ${opacity}`;
      if (name.includes("정상")) return `bg-blue-600 ${opacity}`;
      if (name.includes("할인")) return `bg-cyan-500 ${opacity}`;
      return `bg-slate-400 ${opacity}`;
    } else {
      if (name.includes("프레스티지")) return `bg-amber-100 border border-amber-300 ${opacity}`;
      if (name.includes("정상")) return `bg-blue-100 border border-blue-300 ${opacity}`;
      if (name.includes("할인")) return `bg-cyan-100 border border-cyan-300 ${opacity}`;
      return `bg-slate-100 border border-slate-300 ${opacity}`;
    }
  };

  // 클래스별 좌석 그리드 생성
  // 프레스티지: 2+2 (4열), 일반석: 3+3 (6열)
  const buildGrid = (cls: DashboardClass) => {
    const isPrestige = cls.name.includes("프레스티지");
    const colsPerSide = isPrestige ? 2 : 3;
    const totalCols = colsPerSide * 2;
    const rows = Math.ceil(cls.seats / totalCols);
    const grid: { sold: boolean; seatId: string; exists: boolean }[][] = [];
    let seatNum = 0;
    for (let r = 0; r < rows; r++) {
      const row: { sold: boolean; seatId: string; exists: boolean }[] = [];
      for (let c = 0; c < totalCols; c++) {
        if (seatNum < cls.seats) {
          const colLabel = "ABCDEF"[c];
          row.push({ sold: seatNum < cls.sold, seatId: `${r + 1}${colLabel}`, exists: true });
          seatNum++;
        } else {
          row.push({ sold: false, seatId: "", exists: false });
        }
      }
      grid.push(row);
    }
    return { grid, colsPerSide };
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
          <Plane size={16} style={{ color: "#002561" }} />
          기내 좌석 배치도
          <span className="text-xs font-bold text-slate-400">— {flight.aircraft}</span>
        </h3>
        {/* 범례 */}
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-700 inline-block" /> 예약됨</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-300 inline-block" /> 여석</span>
        </div>
      </div>

      {/* 클래스 범례 바 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {flight.classes.map(cls => (
          <div key={cls.code} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm inline-block ${
              cls.name.includes("프레스티지") ? "bg-amber-500" :
              cls.name.includes("정상") ? "bg-blue-600" :
              cls.name.includes("할인") ? "bg-cyan-500" : "bg-slate-400"
            }`} />
            <span className="text-[10px] font-bold text-slate-600">{cls.name} ({cls.sold}/{cls.seats})</span>
          </div>
        ))}
      </div>

      {/* 기내 배치도: 클래스 구역별 렌더링 */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {flight.classes.map(cls => {
          const { grid, colsPerSide } = buildGrid(cls);
          const isPrestige = cls.name.includes("프레스티지");
          const colLabels = isPrestige ? ["A", "B", "C", "D"] : ["A", "B", "C", "D", "E", "F"];

          return (
            <div key={cls.code}>
              {/* 구역 헤더 */}
              <div className={`flex items-center gap-2 mb-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                cls.name.includes("프레스티지") ? "bg-amber-50 text-amber-700" :
                cls.name.includes("정상") ? "bg-blue-50 text-blue-700" :
                cls.name.includes("할인") ? "bg-cyan-50 text-cyan-700" : "bg-slate-50 text-slate-600"
              }`}>
                <span>{cls.name} 구역</span>
                <span className="font-normal opacity-70">· {cls.status} · L/F {cls.seats > 0 ? Math.round(cls.sold / cls.seats * 100) : 0}%</span>
              </div>

              {/* 열 레이블 */}
              <div
                className="grid gap-1 mb-1 px-6"
                style={{ gridTemplateColumns: `repeat(${colsPerSide}, 1fr) 12px repeat(${colsPerSide}, 1fr)` }}
              >
                {colLabels.slice(0, colsPerSide).map(l => (
                  <div key={l} className="text-[9px] text-center font-black text-slate-400">{l}</div>
                ))}
                <div />
                {colLabels.slice(colsPerSide).map(l => (
                  <div key={l} className="text-[9px] text-center font-black text-slate-400">{l}</div>
                ))}
              </div>

              {/* 좌석 행 */}
              <div className="space-y-1">
                {grid.map((row, rIdx) => (
                  <div key={rIdx} className="flex items-center gap-1">
                    {/* 행 번호 */}
                    <span className="text-[9px] text-slate-300 font-bold w-5 text-right shrink-0">{rIdx + 1}</span>
                    {/* 좌측 좌석들 */}
                    <div className="flex gap-1">
                      {row.slice(0, colsPerSide).map((seat, cIdx) => (
                        seat.exists ? (
                          <button
                            key={cIdx}
                            title={`${seat.seatId} · ${cls.name} · ${cls.price.toLocaleString()}원 · ${seat.sold ? "예약됨" : "여석"}`}
                            onMouseEnter={() => setHoveredSeat({ cls: cls.name, seatId: seat.seatId, sold: seat.sold })}
                            onMouseLeave={() => setHoveredSeat(null)}
                            className={`w-6 h-6 rounded-sm text-[7px] font-black transition-all hover:scale-110 ${clsColor(cls.name, seat.sold, cls.status)} ${seat.sold ? "text-white" : "text-slate-500"}`}
                          >
                            {seat.sold ? "" : ""}
                          </button>
                        ) : <div key={cIdx} className="w-6 h-6" />
                      ))}
                    </div>
                    {/* 통로 */}
                    <div className="w-3" />
                    {/* 우측 좌석들 */}
                    <div className="flex gap-1">
                      {row.slice(colsPerSide).map((seat, cIdx) => (
                        seat.exists ? (
                          <button
                            key={cIdx}
                            title={`${seat.seatId} · ${cls.name} · ${cls.price.toLocaleString()}원 · ${seat.sold ? "예약됨" : "여석"}`}
                            onMouseEnter={() => setHoveredSeat({ cls: cls.name, seatId: seat.seatId, sold: seat.sold })}
                            onMouseLeave={() => setHoveredSeat(null)}
                            className={`w-6 h-6 rounded-sm text-[7px] font-black transition-all hover:scale-110 ${clsColor(cls.name, seat.sold, cls.status)} ${seat.sold ? "text-white" : "text-slate-500"}`}
                          >
                            {seat.sold ? "" : ""}
                          </button>
                        ) : <div key={cIdx} className="w-6 h-6" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 호버 정보 */}
      {hoveredSeat && (
        <div className="mt-3 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg font-bold">
          좌석 {hoveredSeat.seatId} · {hoveredSeat.cls} · {hoveredSeat.sold ? "예약됨" : "여석"}
        </div>
      )}
    </div>
  );
}
