import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Sparkles,
  Send,
  LayoutGrid,
  BarChart4,
  Coins,
  Wallet,
  XCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plane,
  CheckCircle,
  XIcon,
  Calendar,
} from "lucide-react";
import {
  KE_DOMESTIC_ROUTES,
  emsrb,
  type EMSRbInput,
  type DashboardFlight,
  type DashboardClass,
  buildDashboardFlights,
  FLIGHT_AIRCRAFT_MAP,
} from "../data/mockData";
import { useFareStore } from "../stores/fareStore";
import { useAiRecommendationStore } from "../stores/aiRecommendationStore";
import { useFlightsStore } from "../stores/flightsStore";
import apiClient from "../api/apiClient";

const BRAND = "#002561";

const fmtW = (n: number) => `₩${n.toLocaleString()}`;

const REGION_IATA_MAP: Record<string, string[]> = {
  제주: ["CJU"],
  부산: ["PUS"],
  대구: ["TAE"],
  광주: ["KWJ", "KUV"],
  청주: ["CJJ"],
  여수: ["RSU"],
  포항: ["KPO"],
  울산: ["USN"],
  서울: ["GMP", "ICN"],
  인천: ["ICN"],
  김포: ["GMP"],
};

function findRelatedRoutes(issueText: string, currentRoute: string): string[] {
  const mentioned: string[] = [];
  for (const [region, iatas] of Object.entries(REGION_IATA_MAP)) {
    if (issueText.includes(region)) mentioned.push(...iatas);
  }
  if (!mentioned.length) return [];
  return KE_DOMESTIC_ROUTES.filter(
    (r) =>
      r !== currentRoute && r.split("-").some((p) => mentioned.includes(p)),
  );
}

const statusBadgeClass = (s: DashboardFlight["status"]) => {
  const m: Record<string, string> = {
    "수요 급증": "bg-red-100 text-red-600",
    매진임박: "bg-orange-200 text-orange-700",
    안정적: "bg-green-100 text-green-700",
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

function buildWeekAroundDate(
  centerDate: string,
): { date: string; dayOfWeek: string; isToday: boolean; isPeak: boolean }[] {
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

function buildMonthDays(
  year: number,
  month: number,
): { date: string; day: number; inMonth: boolean }[] {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: { date: string; day: number; inMonth: boolean }[] = [];
  const prevLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevLastDate - i;
    days.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: false,
    });
  }
  for (let d = 1; d <= lastDate; d++) {
    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: true,
    });
  }
  const remain = 42 - days.length;
  for (let d = 1; d <= remain; d++) {
    days.push({
      date: `${year}-${String(month + 2).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: false,
    });
  }
  return days;
}

const MONTH_KO = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];
const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

function aiSuggestionLabel(
  current: number,
  ai: number,
): { text: string; color: string } {
  if (ai > current * 1.02)
    return { text: "가격을 올리세요", color: "text-red-600" };
  if (ai < current * 0.98)
    return { text: "가격을 내리세요", color: "text-blue-600" };
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
): { classes: DashboardClass[]; error?: string; logMessages?: string[] } {
  const target = classes.find((c) => c.code === targetCode)!;

  if (target.status === "Closed") {
    return { classes, error: "Closed 등급은 좌석 수를 변경할 수 없습니다." };
  }

  const delta = newSeats - target.seats;
  if (delta === 0) return { classes };

  if (newSeats < target.sold) {
    return {
      classes,
      error: `판매된 좌석(${target.sold}석)보다 적게 줄일 수 없습니다.`,
    };
  }

  // Prestige(C)·Closed·target 외 이코노미 등급 (EMSRb 대상)
  const eligible = classes
    .map((c, i) => ({ c, i }))
    .filter(
      ({ c }) =>
        c.code !== targetCode &&
        !c.name.includes("프레스티지") &&
        c.status !== "Closed",
    );

  if (eligible.length === 0) {
    return { classes, error: "좌석을 재배분할 수 있는 등급이 없습니다." };
  }

  // 고정 좌석 합산: Prestige + Closed + target(newSeats)
  const fixedSeats = classes
    .filter(
      (c) =>
        c.name.includes("프레스티지") ||
        c.status === "Closed" ||
        c.code === targetCode,
    )
    .reduce((s, c) => s + (c.code === targetCode ? newSeats : c.seats), 0);

  const totalSeats = classes.reduce((s, c) => s + c.seats, 0);
  const pool = totalSeats - fixedSeats;

  // eligible 등급의 minSeats(판매석) 합 확인 — pool이 이보다 작으면 총합 불변 원칙 위반
  const eligibleMinSum = eligible.reduce((s, { c }) => s + c.sold, 0);
  if (pool < eligibleMinSum) {
    return {
      classes,
      error: `좌석 변경 불가: 전체 좌석 수(${totalSeats}석)를 초과합니다. 다른 등급의 좌석을 먼저 줄여주세요.`,
    };
  }

  if (pool <= 0) {
    return { classes, error: "재배분 가능한 잔여 좌석이 없습니다." };
  }

  // 현재 전체 LF 추정 (sold/totalSeats)
  const totalSold = classes.reduce((s, c) => s + c.sold, 0);
  const estLf = totalSeats > 0 ? (totalSold / totalSeats) * 100 : 70;
  const cv = estLf >= 80 ? 0.2 : estLf >= 60 ? 0.25 : 0.4;
  const poolDemand = pool * (estLf / 100);

  // 등급별 수요 분담 기준 (가격 내림차순 정렬)
  const ECO_SHARE: Record<string, number> = { Y: 0.2, M: 0.48, V: 0.32 };
  const inputs: EMSRbInput[] = eligible
    .map(({ c }) => {
      const share = ECO_SHARE[c.code] ?? 1 / eligible.length;
      const mu = Math.max(c.sold * 1.3, poolDemand * share);
      return {
        code: c.code,
        price: c.price,
        meanDemand: mu,
        stdDemand: mu * cv,
        minSeats: c.sold,
      };
    })
    .sort((a, b) => b.price - a.price);

  const buckets = emsrb(inputs, pool);

  const dir = delta > 0 ? "증가" : "감소";
  const dirReason =
    delta > 0
      ? `${target.name} 좌석이 ${Math.abs(delta)}석 늘어남에 따라 이코노미 캐빈 내 여유 좌석이 줄었습니다. EMSRb는 남은 pool(${pool}석)을 운임 수익 기여도(가격×수요)를 기준으로 재배분하여 수익 손실을 최소화합니다.`
      : `${target.name} 좌석이 ${Math.abs(delta)}석 줄어들어 이코노미 캐빈에 여유 공간(${pool}석)이 생겼습니다. EMSRb는 추가된 pool을 각 등급의 기대 수요와 운임을 고려해 수익이 가장 극대화되는 방향으로 재배분합니다.`;

  console.group(
    `[EMSRb 좌석 재배분] ${target.name} ${target.seats}석 → ${newSeats}석 (${dir} ${Math.abs(delta)}석)`,
  );
  console.log(`📋 재배분 이유: ${dirReason}`);
  console.log(
    `📊 분석 조건 — 추정 LF: ${estLf.toFixed(1)}%, 수요 변동계수(CV): ${cv} (LF ${estLf >= 80 ? "≥80% → 예측 신뢰도 높음" : estLf >= 60 ? "60~80% → 중간 불확실성" : "<60% → 수요 불확실성 큼"}), 재배분 대상 pool: ${pool}석`,
  );
  console.table(
    inputs.map((inp, k) => {
      const origSeats = eligible.find((e) => e.c.code === inp.code)!.c.seats;
      const diff = buckets[k] - origSeats;
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      const reason =
        diff > 0
          ? `운임 ${inp.price.toLocaleString()}원, 기대수요 ${inp.meanDemand.toFixed(1)}석 — 공급 확대 시 수익 기여 큼`
          : diff < 0
            ? `운임 ${inp.price.toLocaleString()}원, 기대수요 대비 기존 공급 과잉 — 효율적 축소`
            : "수요·운임 균형 — 현행 유지";
      return {
        등급명: eligible.find((e) => e.c.code === inp.code)!.c.name,
        "운임(원)": inp.price.toLocaleString(),
        "기대수요(μ)": inp.meanDemand.toFixed(1),
        "표준편차(σ)": inp.stdDemand.toFixed(1),
        "판매(minSeats)": inp.minSeats,
        "기존 좌석": origSeats,
        "배분 결과": buckets[k],
        변동: diffStr,
        "조정 이유": reason,
      };
    }),
  );

  const updated = classes.map((c) => ({ ...c }));
  const tidx = classes.findIndex((c) => c.code === targetCode);
  updated[tidx] = {
    ...updated[tidx],
    seats: newSeats,
    status:
      newSeats <= target.sold
        ? ("Sold Out" as const)
        : updated[tidx].status === "Sold Out"
          ? ("Open" as const)
          : updated[tidx].status,
  };

  inputs.forEach((inp, k) => {
    const orig = eligible.find((e) => e.c.code === inp.code)!;
    const newSeatCount = buckets[k];
    const prevStatus = orig.c.status;
    const nextStatus: DashboardClass["status"] =
      newSeatCount <= orig.c.sold
        ? "Sold Out"
        : prevStatus === "Sold Out"
          ? "Open"
          : prevStatus;
    if (prevStatus !== nextStatus) {
      console.log(
        `  ✦ ${orig.c.name} 상태 변경: ${prevStatus} → ${nextStatus} (판매 ${orig.c.sold}석 / 배분 ${newSeatCount}석)`,
      );
    }
    updated[orig.i] = {
      ...updated[orig.i],
      seats: newSeatCount,
      status: nextStatus,
    };
  });

  console.groupEnd();

  // 경영층 친화적 변경 이유 로그 생성
  const logMessages: string[] = [];
  logMessages.push(
    `[인벤토리 조정] ${target.name}(${target.code}) ${Math.abs(delta)}석 ${delta > 0 ? "증가" : "감소"} (${target.seats}석 → ${newSeats}석)`,
  );
  inputs.forEach((inp, k) => {
    const orig = eligible.find((e) => e.c.code === inp.code)!;
    const diff = buckets[k] - orig.c.seats;
    if (diff !== 0) {
      const direction = diff > 0 ? "증가" : "감소";
      const reason =
        diff > 0
          ? `수익 기여도가 높아 좌석 공급 확대 (운임 ${inp.price.toLocaleString()}원)`
          : `기존 공급 대비 수요 여유 — 효율적 축소 (운임 ${inp.price.toLocaleString()}원)`;
      logMessages.push(
        `  → ${orig.c.name}(${orig.c.code}): ${orig.c.seats}석 → ${buckets[k]}석 (${Math.abs(diff)}석 ${direction}) | ${reason}`,
      );
    }
  });
  logMessages.push(
    `[근거] EMSRb 알고리즘: 전체 좌석 ${classes.reduce((s, c) => s + c.seats, 0)}석 불변 원칙 하에 기대 수요·운임 기준 수익 극대화 배분`,
  );

  return { classes: updated, logMessages };
}

const TIER_NAME_MAP: Record<string, string> = {
  prestige: "프레스티지",
  economy_full: "일반석 정상",
  economy_discount: "일반석 할인",
  economy_special: "일반석 특가",
};
const STATUS_MAP: Record<string, DashboardClass["status"]> = {
  open: "Open",
  closed: "Closed",
  sold_out: "Sold Out",
};
const FLIGHT_STATUS_MAP = (lf: number): DashboardFlight["status"] => {
  if (lf >= 90) return "매진임박";
  if (lf >= 80) return "수요 급증";
  if (lf >= 60) return "안정적";
  return "수요 저조";
};

// API 응답 → DashboardFlight 변환
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function apiFlightToDashboard(f: any, route: string): DashboardFlight {
  const classes: DashboardClass[] = (f.classes ?? []).map((c: any) => ({
    name: TIER_NAME_MAP[c.tier] ?? c.tier,
    code: c.class_code,
    seats: c.total_seats,
    sold: c.sold_seats,
    price: c.current_price,
    aiPrice: c.ai_recommended_price ?? c.current_price,
    status: STATUS_MAP[c.status] ?? "Open",
  }));
  const aircraft = FLIGHT_AIRCRAFT_MAP[f.flight_number] ?? "B737-800";
  const totalSeats = classes.reduce((s, c) => s + c.seats, 0);
  const currentPrice =
    classes.find((c) => c.code === "Y")?.price ?? classes[0]?.price ?? 0;
  const aiRecommended =
    classes.find((c) => c.code === "Y")?.aiPrice ?? currentPrice;
  return {
    id: f.flight_id,
    time: f.departure_time,
    timeSlot: (f.time_slot === "morning"
      ? "아침"
      : f.time_slot === "forenoon"
        ? "오전"
        : f.time_slot === "afternoon"
          ? "오후"
          : "저녁") as DashboardFlight["timeSlot"],
    status: FLIGHT_STATUS_MAP(f.load_factor),
    lf: Math.round(f.load_factor),
    pace: `${f.pace >= 0 ? "+" : ""}${f.pace?.toFixed(1) ?? "0.0"}%`,
    classes,
    baseCost: f.base_cost,
    flightNo: f.flight_number,
    route,
    reason: f.analysis_reason ?? "",
    aircraft,
    totalSeats,
    currentPrice,
    aiRecommended,
  };
}

// DDMMM 형식으로 날짜 변환 (예: "2026-05-21" → "21MAY")
function toDDMMM(dateStr: string): string {
  const monthLabels = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}${monthLabels[d.getMonth()]}`;
}

export default function FareManagement({ refreshKey }: { refreshKey?: number }) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(KE_DOMESTIC_ROUTES[0]);

  // 초기값은 store에서 읽어와 탭 전환 시 데이터 유지
  const { getFlightsForRoute, setFlightsForRoute } = useFlightsStore();
  const initialFlights = getFlightsForRoute(KE_DOMESTIC_ROUTES[0]);
  const [flights, setFlights] = useState<DashboardFlight[]>(initialFlights);
  const [selectedFlight, setSelectedFlight] = useState<DashboardFlight>(initialFlights[0]);
  // 날짜별 flights 캐시: key = "route:date"
  const routeDateCache = useRef<Map<string, DashboardFlight[]>>(new Map());
  const [editState, setEditState] = useState<EditState | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  type ClassAdj = {
    code: string;
    name: string;
    current_price: number;
    recommended_price: number;
    reason: string;
  };
  type CrossRouteApplyResult = {
    route: string;
    flightId: string;
    adjustments: ClassAdj[];
  };
  const [aiPopup, setAiPopup] = useState<{
    desc: string;
    recommendedPrice?: number;
    classAdjustments?: ClassAdj[];
    irrelevant?: boolean;
    relatedRoutes?: string[];
    issueText?: string;
    crossRouteResults?: CrossRouteApplyResult[];
    crossRouteLoading?: boolean;
  } | null>(null);
  // 다른 노선에 AI 전략 적용된 가격: route → flightId → classCode → price
  const [crossRouteAiPrices, setCrossRouteAiPrices] = useState<
    Record<string, Record<string, Record<string, number>>>
  >({});
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // 거부는 음영 없이 배지만 표시 — 편집은 여전히 허용
  const [rejectedClasses, setRejectedClasses] = useState<Set<string>>(
    new Set(),
  );
  // 확정으로 인해 AI 추천 영역만 조용히 숨기는 set (거부됨 배지 없음)
  const [confirmedClasses, setConfirmedClasses] = useState<Set<string>>(
    new Set(),
  );
  // AI 추천이 1건 이상 적용된 flightId set — "적용 완료" 레이블용
  const [appliedFlights, setAppliedFlights] = useState<Set<string>>(new Set());
  const [seatAlert, setSeatAlert] = useState<string | null>(null);
  const [inventoryLogPopup, setInventoryLogPopup] = useState<{
    messages: string[];
    flightId: string;
  } | null>(null);
  // URL /fares/<flightId> 형태에서 초기 step 결정
  const [step, setStep] = useState<"list" | "detail">(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length >= 2 && parts[0] === "fares" ? "detail" : "list";
  });
  const aiRef = useRef<HTMLTextAreaElement>(null);
  const { updateFare } = useFareStore();
  const { approveRecommendation, rejectRecommendation, fetchRecommendations } =
    useAiRecommendationStore();

  // flights 상태 변경 시 공유 스토어 + 날짜별 캐시에도 동기화
  const setFlightsAndSync = useCallback(
    (updated: DashboardFlight[] | ((prev: DashboardFlight[]) => DashboardFlight[])) => {
      setFlights((prev) => {
        const next = typeof updated === "function" ? updated(prev) : updated;
        setFlightsForRoute(selectedRoute, next);
        routeDateCache.current.set(`${selectedRoute}:${selectedDate}`, next);
        return next;
      });
    },
    [selectedRoute, selectedDate, setFlightsForRoute],
  );
  const [aiDetailPopup, setAiDetailPopup] = useState<{
    flightId: string;
    cls: DashboardClass;
  } | null>(null);

  // LF × D-Day × Elasticity 기반 클래스별 AI 분석 근거 생성
  const buildAiReason = (
    flight: DashboardFlight,
    cls: DashboardClass,
  ): { summary: string; bullets: string[] } => {
    const lf = flight.lf;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dep = flight.departureDate
      ? new Date(flight.departureDate)
      : new Date(selectedDate);
    dep.setHours(0, 0, 0, 0);
    const dDays = Math.max(0, Math.round((dep.getTime() - today.getTime()) / 86400000));
    const paceVal = parseFloat((flight.pace ?? "0%").replace("%", "")) || 0;
    const ELASTICITY: Record<string, number> = { C: -0.45, Y: -0.95, M: -1.35, V: -1.75 };
    const elasticity = ELASTICITY[cls.code] ?? -0.95;
    const changePct = Math.round((cls.aiPrice / cls.price - 1) * 100);

    const lfLabel =
      lf >= 80 ? "수요 급증 (High)" :
      lf >= 65 ? "수요 안정 (Stable)" :
      lf >= 30 ? "수요 부족 (Low)" : "수요 매우 저조 (Very Low)";
    const dLabel = dDays === 0 ? "출발 당일" : `출발 D-${dDays}`;
    const paceLabel =
      paceVal > 3 ? `전주 대비 예약 속도 빠름 (+${paceVal}%)` :
      paceVal < -3 ? `전주 대비 예약 속도 느림 (${paceVal}%)` :
      "전주 대비 예약 속도 보통";
    const elasticityLabel =
      Math.abs(elasticity) >= 1.5 ? "고탄력 (가격 민감도 높음)" :
      Math.abs(elasticity) >= 0.9 ? "중탄력" : "저탄력 (가격 민감도 낮음)";

    const summary =
      lf >= 80
        ? `LF ${lf}% · ${dLabel} — 수요 초과 상태로 ${cls.name} 운임 ${changePct > 0 ? "+" : ""}${changePct}% 인상 추천`
        : lf >= 65 && changePct > 0
          ? `LF ${lf}% · ${dLabel} — 수요 안정, 소폭 인상으로 수익 마진 확보 추천`
          : `LF ${lf}% · ${dLabel} — 수요 부족으로 ${cls.name} 운임 ${changePct}% 인하 추천`;

    const bullets: string[] = [
      `📊 Load Factor: ${lf}% (${lfLabel})`,
      `📅 출발일까지: ${dLabel}`,
      `⚡ 예약 속도: ${paceLabel}`,
      `🎯 ${cls.name} 탄력성: ${elasticity} (${elasticityLabel})`,
    ];

    if (lf >= 80) {
      if (dDays >= 15) bullets.push("📈 D-15 이상 — 최대 인상폭 적용 (+18% 기준)");
      else if (dDays >= 7) bullets.push("📈 D-7~14 — 인상폭 중간 적용 (+12% 기준)");
      else bullets.push("📈 D-7 미만 출발 임박 — 인상폭 제한 적용 (+8% 기준)");
    } else if (lf >= 30) {
      if (dDays <= 7) bullets.push("📉 출발 임박 + 수요 저조 — 파격 인하로 공석 최소화 (-15% 기준)");
      else bullets.push("📉 출발 여유 있음 — 얼리버드 소폭 인하 권고 (-8% 기준)");
    } else {
      if (dDays <= 7) bullets.push("📉 출발 임박 + 수요 매우 저조 — 땡처리 할인 적용 (-25% 기준)");
      else bullets.push("📉 출발 여유 있음 — 얼리버드 유인 할인 적용 (-12% 기준)");
    }

    if (Math.abs(elasticity) >= 1.5) {
      bullets.push(`✂️ 고탄력 클래스: 인상폭 축소 / 인하폭 확대 보정 적용`);
    } else if (Math.abs(elasticity) <= 0.5) {
      bullets.push(`💎 저탄력 클래스: 인상폭 유지 (가격 변화에 수요 둔감)`);
    }

    if (Math.abs(paceVal) > 3) {
      bullets.push(`🔄 Booking Velocity 보정: ${paceVal > 0 ? "+" : ""}${Math.round(paceVal * 0.3)}% 추가 조정`);
    }

    bullets.push(`🛡️ Guardrail: 현재가 ±30% 범위 내 클램핑 적용 (BR-03)`);

    return { summary, bullets };
  };
  // 주간 피커: 실제로 화면에 표시할 날짜(애니메이션 중엔 이전 날짜 유지)
  const [displayedDate, setDisplayedDate] = useState(todayStr);
  const [weekPhase, setWeekPhase] = useState<
    "idle" | "exit-left" | "exit-right" | "enter-left" | "enter-right"
  >("idle");
  const weekAnimLock = useRef(false);

  const monthDays = buildMonthDays(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else setCalMonth((m) => m + 1);
  };

  // exit → swap → enter 3단계 슬라이드 전환
  const changeDate = useCallback(
    (newDate: string, direction?: "left" | "right") => {
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
    },
    [],
  );

  // 노선/날짜가 실제로 변경됐을 때만 새로 로드 (마운트 시에는 store 데이터 유지)
  const prevRouteRef = useRef(selectedRoute);
  const prevDateRef = useRef(selectedDate);

  useEffect(() => {
    const routeChanged = prevRouteRef.current !== selectedRoute;
    const dateChanged = prevDateRef.current !== selectedDate;
    prevRouteRef.current = selectedRoute;
    prevDateRef.current = selectedDate;

    // 마운트 직후(아무것도 안 바뀐 상태)에는 initialFlights를 그대로 사용 — 재세팅 없음
    if (!routeChanged && !dateChanged) return;

    // 노선 또는 날짜가 실제 변경된 경우에만 API/mock 재로드
    let cancelled = false;
    const loadFlights = async () => {
      // 이전에 이 노선+날짜 조합을 로드한 적 있으면 캐시에서 복원
      const cacheKey = `${selectedRoute}:${selectedDate}`;
      const cached = routeDateCache.current.get(cacheKey);
      if (cached) {
        setFlights(cached);
        setFlightsForRoute(selectedRoute, cached);
        setSelectedFlight(cached[0]);
        setRejectedClasses(new Set());
        return;
      }
      try {
        const data = await apiClient.get<unknown[]>(
          `/fares/${selectedRoute}?date=${selectedDate}`,
        );
        if (cancelled || !Array.isArray(data) || data.length === 0) {
          const base = buildDashboardFlights(selectedRoute, selectedDate);
          const routeMap = crossRouteAiPrices[selectedRoute];
          const fallback = base.map((f) => {
            const flightMap = routeMap?.[f.id];
            if (!flightMap) return f;
            return {
              ...f,
              classes: f.classes.map((c) =>
                flightMap[c.code] != null ? { ...c, price: flightMap[c.code] } : c,
              ),
            };
          });
          if (!cancelled) {
            setFlightsAndSync(fallback);
            setSelectedFlight(fallback[0]);
          }
          return;
        }
        const mapped = data.map((f) => apiFlightToDashboard(f, selectedRoute));
        const routeMap = crossRouteAiPrices[selectedRoute];
        const newFlights = mapped.map((f) => {
          const flightMap = routeMap?.[f.id];
          if (!flightMap) return f;
          return {
            ...f,
            classes: f.classes.map((c) =>
              flightMap[c.code] != null ? { ...c, price: flightMap[c.code] } : c,
            ),
          };
        });
        const urlFlightId = window.location.pathname.split("/")[2];
        const restoredFlight = urlFlightId
          ? (newFlights.find((f) => f.flightNo === urlFlightId) ?? newFlights[0])
          : newFlights[0];
        setFlightsAndSync(newFlights);
        setSelectedFlight(restoredFlight);
      } catch {
        if (cancelled) return;
        const base = buildDashboardFlights(selectedRoute, selectedDate);
        const urlFlightId = window.location.pathname.split("/")[2];
        const restoredFlight = urlFlightId
          ? (base.find((f) => f.flightNo === urlFlightId) ?? base[0])
          : base[0];
        setFlightsAndSync(base);
        setSelectedFlight(restoredFlight);
      }
      setRejectedClasses(new Set());
    };
    void loadFlights();
    return () => {
      cancelled = true;
    };
  // crossRouteAiPrices는 AI 가격만 반영 — 노선/날짜 변경과 독립적으로 처리
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoute, selectedDate]);

  // step 전환 helper: URL도 함께 업데이트
  const goToDetail = (flight: DashboardFlight) => {
    window.history.pushState({}, "", `/fares/${flight.flightNo}`);
    setSelectedFlight(flight);
    setStep("detail");
  };
  const goToList = () => {
    window.history.pushState({}, "", `/fares`);
    setStep("list");
  };

  // 브라우저 뒤로/앞으로 가기로 step 복원
  useEffect(() => {
    const onPop = () => {
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && parts[0] === "fares") {
        setStep("detail");
      } else {
        setStep("list");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

// 새로고침 버튼: store가 이미 갱신됐으므로 로컬 state만 동기화 + AI 추천 업데이트
  useEffect(() => {
    if (!refreshKey) return;
    routeDateCache.current.clear();
    const refreshed = getFlightsForRoute(selectedRoute);
    setFlights(refreshed);
    setSelectedFlight((prev) => refreshed.find((f) => f.id === prev.id) ?? refreshed[0]);
    fetchRecommendations(selectedRoute);
    setAppliedFlights(new Set());
    setRejectedClasses(new Set());
    setConfirmedClasses(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const syncSelected = (updated: DashboardFlight[]) => {
    const found = updated.find((f) => f.id === selectedFlight.id);
    if (found) setSelectedFlight(found);
  };

  const startEdit = (
    flightId: string,
    classCode: string,
    field: "price" | "seats",
    cur: number,
  ) => {
    setEditState({ flightId, classCode, field, value: String(cur) });
  };
  const commitEdit = () => {
    if (!editState) return;
    const num = parseInt(editState.value, 10);
    if (isNaN(num) || num < 0) {
      setEditState(null);
      return;
    }

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
      setFlightsAndSync(updated);
      syncSelected(updated);
      setEditState(null);
      // DB에 즉시 반영 (fire-and-forget, 오류는 콘솔 기록)
      void apiClient
        .put(`/fares/${editState.flightId}`, {
          class_code: editState.classCode,
          new_price: num,
          updated_by: "Revenue Manager",
        })
        .catch((e) =>
          console.warn("[FareManagement] price DB save failed:", e),
        );
      return;
    }

    // 좌석 수 변경 — 총 좌석 불변 원칙, AI 재배분
    const flight = flights.find((f) => f.id === editState.flightId);
    if (!flight) {
      setEditState(null);
      return;
    }
    const targetCls = flight.classes.find(
      (c) => c.code === editState.classCode,
    );
    if (!targetCls) {
      setEditState(null);
      return;
    }

    // 프레스티지·Closed 좌석 수 변경 불가 (방어)
    if (
      targetCls.name.includes("프레스티지") ||
      targetCls.status === "Closed"
    ) {
      setEditState(null);
      return;
    }

    // Sold Out: 증가만 허용
    if (targetCls.status === "Sold Out" && num <= targetCls.seats) {
      setSeatAlert("매진 등급은 좌석 수를 늘리기만 가능합니다.");
      setTimeout(() => setSeatAlert(null), 4000);
      setEditState(null);
      return;
    }

    const newSeats = Math.max(num, targetCls.sold); // sold 보다 작아질 수 없음
    const {
      classes: newClasses,
      error,
      logMessages,
    } = aiReallocateSeats(flight.classes, editState.classCode, newSeats);
    if (error) {
      setSeatAlert(error);
      setTimeout(() => setSeatAlert(null), 4000);
      setEditState(null);
      return;
    }

    const updated = flights.map((f) =>
      f.id !== editState.flightId ? f : { ...f, classes: newClasses },
    );
    setFlightsAndSync(updated);
    syncSelected(updated);
    if (logMessages && logMessages.length > 0) {
      setInventoryLogPopup({
        messages: logMessages,
        flightId: editState.flightId,
      });
    }

    // DB에 재배분된 모든 클래스 공급석 즉시 저장 (fire-and-forget)
    const flightId = editState.flightId;
    for (const cls of newClasses) {
      void apiClient
        .put(`/fares/${flightId}/seats`, {
          class_code: cls.code,
          new_total_seats: cls.seats,
          updated_by: "Revenue Manager",
        })
        .catch((e) => console.warn("[FareManagement] seat DB save failed:", e));
    }

    setEditState(null);
  };

  const runAi = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiClient.post<{
        description: string;
        recommended_price?: number;
        class_adjustments?: ClassAdj[];
        irrelevant?: boolean;
      }>("/recommendations/strategy", {
        issue_text: aiQuery,
        route: selectedRoute,
        flight_id: selectedFlight.id,
        classes: selectedFlight.classes.map((c) => ({
          code: c.code,
          name: c.name,
          seats: c.seats,
          sold: c.sold,
          price: c.price,
          status: c.status,
        })),
      });
      const related = res.irrelevant
        ? findRelatedRoutes(aiQuery, selectedRoute)
        : [];
      setAiPopup({
        desc: res.description,
        recommendedPrice: res.recommended_price,
        classAdjustments: res.class_adjustments,
        irrelevant: res.irrelevant,
        relatedRoutes: related.length ? related : undefined,
        issueText: aiQuery,
      });
    } catch {
      // 백엔드 연결 실패 시 로컬 fallback
      const up = selectedFlight.aiRecommended > selectedFlight.currentPrice;
      setAiPopup({
        desc: `"${aiQuery}" 분석 결과 — 해당 이슈로 수요 변동 가능성이 감지되었습니다. ${up ? "하위 클래스 인벤토리 즉시 회수 및" : ""} ${selectedFlight.id} 운임을 ${fmtW(selectedFlight.aiRecommended)}으로 ${up ? "인상" : "조정"}하십시오.`,
        classAdjustments: selectedFlight.classes.map((c) => ({
          code: c.code,
          name: c.name,
          current_price: c.price,
          recommended_price: c.aiPrice,
          reason: up ? "수요 급증 — 인상 권고" : "수요 저조 — 인하 권고",
        })),
      });
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiPopup = () => {
    const adjMap = new Map(
      (aiPopup?.classAdjustments ?? []).map((a) => [
        a.code,
        a.recommended_price,
      ]),
    );
    const updated = flights.map((f) => {
      if (f.id !== selectedFlight.id) return f;
      const newClasses = f.classes.map((c) => {
        const newPrice = adjMap.has(c.code) ? adjMap.get(c.code)! : c.price;
        return { ...c, price: newPrice, aiPrice: newPrice };
      });
      const newCurrentPrice = newClasses.reduce(
        (min, c) => (c.price < min ? c.price : min),
        newClasses[0]?.price ?? f.currentPrice,
      );
      return { ...f, currentPrice: newCurrentPrice, classes: newClasses };
    });
    setFlightsAndSync(updated);
    syncSelected(updated);
    setAppliedFlights((prev) => new Set(prev).add(`${selectedDate}:${selectedFlight.id}`));
    setConfirmedClasses((prev) => {
      const next = new Set(prev);
      adjMap.forEach((_, code) => next.add(`${selectedDate}:${selectedFlight.id}-${code}`));
      return next;
    });
    setAiPopup(null);
    setAiQuery("");
  };

  const applyCrossRoutes = async (routes: string[], issueText: string) => {
    setAiPopup((prev) => (prev ? { ...prev, crossRouteLoading: true } : prev));
    const results: CrossRouteApplyResult[] = [];
    const newCrossMap: Record<
      string,
      Record<string, Record<string, number>>
    > = {};

    for (const route of routes) {
      let routeFlights: DashboardFlight[];
      try {
        const data = await apiClient.get<unknown[]>(
          `/fares/${route}?date=${selectedDate}`,
        );
        routeFlights =
          Array.isArray(data) && data.length > 0
            ? data.map((f) => apiFlightToDashboard(f, route))
            : buildDashboardFlights(route, selectedDate);
      } catch {
        routeFlights = buildDashboardFlights(route, selectedDate);
      }
      for (const flight of routeFlights) {
        try {
          const res = await apiClient.post<{
            description: string;
            class_adjustments?: ClassAdj[];
            irrelevant?: boolean;
          }>("/recommendations/strategy", {
            issue_text: issueText,
            route,
            flight_id: flight.id,
            force_relevant: true,
            classes: flight.classes.map((c) => ({
              code: c.code,
              name: c.name,
              seats: c.seats,
              sold: c.sold,
              price: c.price,
              status: c.status,
            })),
          });
          if (!res.irrelevant && res.class_adjustments?.length) {
            results.push({
              route,
              flightId: flight.id,
              adjustments: res.class_adjustments,
            });
            if (!newCrossMap[route]) newCrossMap[route] = {};
            newCrossMap[route][flight.id] = {};
            for (const adj of res.class_adjustments) {
              newCrossMap[route][flight.id][adj.code] = adj.recommended_price;
            }
          }
        } catch {
          /* 개별 편 실패는 무시 */
        }
      }
    }

    setCrossRouteAiPrices((prev) => {
      const merged = { ...prev };
      for (const [route, flights] of Object.entries(newCrossMap)) {
        merged[route] = { ...(merged[route] ?? {}), ...flights };
      }
      return merged;
    });

    setAiPopup((prev) =>
      prev
        ? { ...prev, crossRouteLoading: false, crossRouteResults: results }
        : prev,
    );
  };

  const applyAiClass = (flightId: string, classCode: string) => {
    const updated = flights.map((f) => {
      if (f.id !== flightId) return f;
      const newClasses = f.classes.map((c) =>
        c.code === classCode ? { ...c, price: c.aiPrice, aiPrice: c.aiPrice } : c,
      );
      const yClass = newClasses.find((c) => c.code === "Y");
      const newCurrentPrice = yClass?.price ?? f.currentPrice;
      const newAiRecommended = yClass?.aiPrice ?? f.aiRecommended;
      return { ...f, classes: newClasses, currentPrice: newCurrentPrice, aiRecommended: newAiRecommended };
    });
    setFlightsAndSync(updated);
    syncSelected(updated);
    setAppliedFlights((prev) => new Set(prev).add(`${selectedDate}:${flightId}`));
    setConfirmedClasses((prev) => new Set(prev).add(`${selectedDate}:${flightId}-${classCode}`));
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
    setFlightsAndSync(updated);
    syncSelected(updated);
  };

  const handleRejectAi = (flightId: string, classCode: string) => {
    rejectRecommendation(`${flightId}-${classCode}`);
    setRejectedClasses((prev) => new Set(prev).add(`${flightId}-${classCode}`));
    setAiDetailPopup(null);
  };

  const handleConfirmInventory = async () => {
    setConfirmLoading(true);
    setConfirmError(null);
    let hasError = false;

    // AI 추천이 있는 클래스는 aiPrice로, 없으면 현재 price 그대로 확정
    const classesToSave = selectedFlight.classes.map((cls) => ({
      code: cls.code,
      price: cls.aiPrice !== cls.price ? cls.aiPrice : cls.price,
    }));

    try {
      for (const { code, price } of classesToSave) {
        await apiClient.put(`/fares/${selectedFlight.id}`, {
          class_code: code,
          new_price: price,
          updated_by: "Revenue Manager",
        });
      }
    } catch (err: unknown) {
      hasError = true;
      const detail =
        err instanceof Error
          ? err.message
          : "백엔드 저장 중 오류가 발생했습니다.";
      setConfirmError(detail);
      setTimeout(() => setConfirmError(null), 4000);
    } finally {
      setConfirmLoading(false);
    }

    if (!hasError) {
      // 로컬 상태: price를 aiPrice로 덮어쓰고 aiPrice도 동기화
      const updatedFlights = flights.map((f) => {
        if (f.id !== selectedFlight.id) return f;
        const newClasses = f.classes.map((cls) => {
          const confirmed = classesToSave.find((c) => c.code === cls.code);
          if (!confirmed) return cls;
          return { ...cls, price: confirmed.price, aiPrice: confirmed.price };
        });
        const yClass = newClasses.find((c) => c.code === "Y");
        return {
          ...f,
          classes: newClasses,
          currentPrice: yClass?.price ?? f.currentPrice,
          aiRecommended: yClass?.price ?? f.aiRecommended,
        };
      });
      setFlightsAndSync(updatedFlights);
      syncSelected(updatedFlights);

      // 확정한 클래스 전부 confirmedClasses에 추가
      setConfirmedClasses((prev) => {
        const next = new Set(prev);
        for (const cls of selectedFlight.classes) {
          next.add(`${selectedDate}:${selectedFlight.id}-${cls.code}`);
        }
        return next;
      });
      // appliedFlights에도 추가 → Step1 목록에 "적용 완료" 표시
      setAppliedFlights((prev) =>
        new Set(prev).add(`${selectedDate}:${selectedFlight.id}`),
      );
      setConfirmDone(true);
      setTimeout(() => setConfirmDone(false), 2500);
    }
  };

  const revenue = selectedFlight.classes.reduce(
    (s, c) => s + c.sold * c.price,
    0,
  );
  const cost = selectedFlight.baseCost;
  const profit = revenue - cost;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";
  const soldSeats = selectedFlight.classes.reduce((s, c) => s + c.sold, 0);

  // 선택 항공편에 미처리 AI 추천이 하나라도 있는지 여부
  const hasPendingAi = selectedFlight.classes.some((c) => {
    const key = `${selectedFlight.id}-${c.code}`;
    const dateKey = `${selectedDate}:${key}`;
    return (
      c.aiPrice !== c.price &&
      !rejectedClasses.has(key) &&
      !confirmedClasses.has(dateKey)
    );
  });

  return (
    <div className="space-y-0" data-testid="fare-management-page">
      {/* AI 추천 상세 모달 */}
      {aiDetailPopup &&
        (() => {
          const { cls } = aiDetailPopup;
          const rejKey = `${aiDetailPopup.flightId}-${cls.code}`;
          const isUp = cls.aiPrice > cls.price;
          const pct = Math.round(
            (Math.abs(cls.aiPrice - cls.price) / cls.price) * 100,
          );
          const soldPct =
            cls.seats > 0 ? Math.round((cls.sold / cls.seats) * 100) : 0;
          const aiReason = buildAiReason(selectedFlight, cls);
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
                    <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-base">
                        AI 추천 상세
                      </h3>
                      <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                        {aiDetailPopup.flightId} · {cls.name} · {selectedRoute}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAiDetailPopup(null)}
                    className="text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <XCircle size={22} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 mb-4">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 font-bold mb-1">
                      현재 운임
                    </div>
                    <div className="text-xl font-black text-slate-400 line-through">
                      {cls.price.toLocaleString()}원
                    </div>
                  </div>
                  <div
                    className={`flex flex-col items-center gap-1 text-sm font-black ${isUp ? "text-red-500" : "text-blue-500"}`}
                  >
                    {isUp ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                    {isUp ? "+" : "-"}
                    {pct}%
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 font-bold mb-1">
                      AI 추천 운임
                    </div>
                    <div
                      className={`text-xl font-black ${isUp ? "text-red-600" : "text-blue-600"}`}
                    >
                      {cls.aiPrice.toLocaleString()}원
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={12} className="text-purple-500" />
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">
                      AI 분석 근거
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-800 mb-2 leading-snug">
                    {aiReason.summary}
                  </p>
                  <ul className="space-y-1">
                    {aiReason.bullets.map((b, i) => (
                      <li key={i} className="text-[11px] text-slate-600 leading-relaxed">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>현재 판매율</span>
                    <span className="text-purple-600 font-black">
                      {soldPct}% ({cls.sold}/{cls.seats}석)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all"
                      style={{ width: `${soldPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                    <span>잔여 {cls.seats - cls.sold}석</span>
                    <span
                      className={`px-2 py-0.5 rounded-full ${cls.status === "Open" ? "bg-green-100 text-green-600" : cls.status === "Sold Out" ? "bg-red-200 text-red-700" : "bg-red-100 text-red-500"}`}
                    >
                      {cls.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      handleRejectAi(aiDetailPopup.flightId, cls.code)
                    }
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

      {/* 인벤토리 변경 이력 팝업 */}
      {inventoryLogPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.50)" }}
          onClick={() => setInventoryLogPopup(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex justify-between items-center bg-slate-800">
              <div className="flex items-center gap-2">
                <LayoutGrid size={17} className="text-white" />
                <h3 className="font-black text-white text-sm tracking-tight">
                  인벤토리 변경 이력
                </h3>
                <span className="text-[10px] text-slate-300 font-bold">
                  {inventoryLogPopup.flightId}
                </span>
              </div>
              <button
                onClick={() => setInventoryLogPopup(null)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] text-slate-500 font-bold mb-3 uppercase tracking-wider">
                EMSRb 알고리즘 기반 좌석 재배분 결과
              </p>
              <ul className="space-y-2">
                {inventoryLogPopup.messages.map((msg, i) => (
                  <li
                    key={i}
                    className={`text-xs font-medium rounded-lg px-3 py-2 ${
                      msg.startsWith("[인벤토리")
                        ? "bg-blue-50 text-blue-800 font-black"
                        : msg.startsWith("[근거]")
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {msg}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                * 총 좌석 수 불변 원칙 하에 수익 극대화 방향으로 자동
                재배분되었습니다.
              </p>
            </div>
            <div className="px-5 pb-4 flex justify-end">
              <button
                onClick={() => setInventoryLogPopup(null)}
                className="px-4 py-2 rounded-lg font-black text-sm text-white transition-all hover:opacity-90"
                style={{ backgroundColor: BRAND }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 전략 분석 결과 모달 */}
      {aiPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={() => setAiPopup(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div
              className="px-6 py-4 flex justify-between items-center"
              style={{
                background: "linear-gradient(135deg, #002561 0%, #0040a8 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                >
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base tracking-tight">
                    AI 전략 분석 결과
                  </h3>
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                    style={{ color: "#93c5fd" }}
                  >
                    {selectedFlight.flightNo} · {selectedRoute}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiPopup(null)}
                className="transition-colors"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.5)")
                }
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* 무관 이슈 안내 */}
              {aiPopup.irrelevant ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      <XCircle size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-amber-700 uppercase tracking-wider mb-1.5">
                        현재 항공편과 무관한 이슈
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {aiPopup.desc}
                      </p>
                    </div>
                  </div>

                  {/* 연관 노선 적용 제안 */}
                  {aiPopup.relatedRoutes &&
                    aiPopup.relatedRoutes.length > 0 &&
                    !aiPopup.crossRouteResults && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-blue-500" />
                          <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider">
                            관련 노선 감지됨
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          이슈가 아래 노선과 관련될 수 있습니다. 해당 노선
                          항공편에 AI 전략을 분석·적용할까요?
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiPopup.relatedRoutes.map((r) => (
                            <span
                              key={r}
                              className="px-2.5 py-1 bg-white border border-blue-300 rounded-full text-xs font-black text-blue-700"
                            >
                              {r.replace("-", " ↔ ")}
                            </span>
                          ))}
                        </div>
                        <button
                          disabled={aiPopup.crossRouteLoading}
                          onClick={() =>
                            applyCrossRoutes(
                              aiPopup.relatedRoutes!,
                              aiPopup.issueText!,
                            )
                          }
                          className="w-full py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all text-white shadow-sm active:scale-95 disabled:opacity-60"
                          style={{ backgroundColor: BRAND }}
                        >
                          {aiPopup.crossRouteLoading ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />{" "}
                              분석 중...
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} /> 해당 노선에 AI 전략 적용
                            </>
                          )}
                        </button>
                      </div>
                    )}

                  {/* 적용 결과 */}
                  {aiPopup.crossRouteResults && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-[11px] font-black text-green-700 uppercase tracking-wider">
                          적용 완료
                        </span>
                      </div>
                      {aiPopup.crossRouteResults.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          분석 결과 관련 노선의 운임 조정이 필요하지 않습니다.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(
                            aiPopup.crossRouteResults.reduce<
                              Record<string, number>
                            >((acc, r) => {
                              acc[r.route] = (acc[r.route] ?? 0) + 1;
                              return acc;
                            }, {}),
                          ).map(([route, cnt]) => (
                            <div
                              key={route}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="font-black text-slate-700">
                                {route.replace("-", " ↔ ")}
                              </span>
                              <span className="text-green-600 font-bold">
                                {cnt}개 편 적용됨
                              </span>
                            </div>
                          ))}
                          <p className="text-[10px] text-slate-400 pt-1">
                            해당 노선으로 이동하면 변경된 운임을 확인할 수
                            있습니다.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setAiPopup(null)}
                      className="flex-1 py-3 rounded-xl font-black text-sm transition-all"
                      style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e2e8f0")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f1f5f9")
                      }
                    >
                      닫기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* 분석 요약 */}
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block w-1 h-4 rounded-full bg-sky-500" />
                      <span className="text-[11px] font-black text-sky-600 uppercase tracking-wider">
                        AI 분석 요약
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {aiPopup.desc
                        .split(
                          /(즉각|즉시|권고|인상|조정|회수|수요 변동|긴급|경고|주의|상승|감소|위험|인하)/,
                        )
                        .map((part, i) =>
                          /(즉각|즉시|권고|인상|조정|회수|수요 변동|긴급|경고|주의|상승|감소|위험|인하)/.test(
                            part,
                          ) ? (
                            <mark
                              key={i}
                              className="not-italic rounded px-0.5"
                              style={{
                                backgroundColor: "#fef3c7",
                                color: "#b45309",
                                fontWeight: 900,
                              }}
                            >
                              {part}
                            </mark>
                          ) : (
                            part
                          ),
                        )}
                    </p>
                  </div>

                  {/* 등급별 추천가 테이블 */}
                  {aiPopup.classAdjustments &&
                    aiPopup.classAdjustments.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block w-1 h-4 rounded-full bg-purple-500" />
                          <span className="text-[11px] font-black text-purple-600 uppercase tracking-wider">
                            등급별 권고 운임
                          </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                                <th className="px-3 py-2 text-left">등급</th>
                                <th className="px-3 py-2 text-right">
                                  현재 운임
                                </th>
                                <th className="px-3 py-2 text-right">
                                  권고 운임
                                </th>
                                <th className="px-3 py-2 text-right">변동</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {aiPopup.classAdjustments.map((adj) => {
                                const diff =
                                  adj.recommended_price - adj.current_price;
                                const pct =
                                  adj.current_price > 0
                                    ? Math.round(
                                        (diff / adj.current_price) * 100,
                                      )
                                    : 0;
                                const up = diff > 0;
                                const same = diff === 0;
                                return (
                                  <tr
                                    key={adj.code}
                                    className="hover:bg-slate-50 transition-colors"
                                  >
                                    <td className="px-3 py-2.5">
                                      <div className="font-black text-slate-800 text-xs">
                                        {adj.name}
                                      </div>
                                      <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                                        {adj.reason}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-400 text-xs">
                                      {fmtW(adj.current_price)}
                                    </td>
                                    <td
                                      className="px-3 py-2.5 text-right font-mono font-black text-xs"
                                      style={{ color: BRAND }}
                                    >
                                      {fmtW(adj.recommended_price)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      {same ? (
                                        <span className="text-[10px] font-black text-slate-400">
                                          유지
                                        </span>
                                      ) : (
                                        <span
                                          className={`text-[10px] font-black flex items-center justify-end gap-0.5 ${up ? "text-red-500" : "text-blue-500"}`}
                                        >
                                          {up ? (
                                            <TrendingUp size={10} />
                                          ) : (
                                            <TrendingDown size={10} />
                                          )}
                                          {up ? "+" : ""}
                                          {pct}%
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  {/* 액션 버튼 */}
                  <div className="flex gap-3 pt-1">
                    <button
                      data-testid="strategy-reject-btn"
                      onClick={() => setAiPopup(null)}
                      className="flex-1 py-3 rounded-xl font-black text-sm transition-all"
                      style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e2e8f0")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f1f5f9")
                      }
                    >
                      기각
                    </button>
                    <button
                      data-testid="strategy-approve-btn"
                      onClick={applyAiPopup}
                      className="flex-1 text-white py-3 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      style={{ backgroundColor: BRAND }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.88")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                    >
                      <CheckCircle size={15} />
                      전략 승인 및 전체 적용
                    </button>
                  </div>
                </>
              )}
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

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto pb-8">
        {/* ── STEP 1: 노선·일자 설정 + 운항 현황 ── */}
        {step === "list" && (
          <div className="grid grid-cols-12 gap-4 sm:gap-5">
            {/* 좌측: 노선·날짜 설정 */}
            <aside className="col-span-12 lg:col-span-3 space-y-4">
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
                      <option key={r} value={r}>
                        {r.replace("-", " ↔ ")}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setShowCalendar((v) => !v)}
                    className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all"
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Calendar size={14} className="text-blue-500" />
                      {selectedDate}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${showCalendar ? "rotate-90" : ""}`}
                    />
                  </button>

                  {showCalendar && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-md">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <button
                          onClick={prevMonth}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-black text-slate-700">
                          {calYear}년 {MONTH_KO[calMonth]}
                        </span>
                        <button
                          onClick={nextMonth}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 text-center border-b border-slate-100">
                        {DOW_KO.map((d, i) => (
                          <div
                            key={d}
                            className={`text-[9px] font-black py-1.5 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-500" : "text-slate-400"}`}
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7">
                        {monthDays.map((d, i) => {
                          const isSelected = selectedDate === d.date;
                          const isToday = d.date === todayStr;
                          const isPast = d.date < todayStr;
                          const dow = i % 7;
                          return (
                            <button
                              key={d.date}
                              onClick={() => {
                                if (d.inMonth && !isPast) {
                                  changeDate(d.date);
                                  setShowCalendar(false);
                                }
                              }}
                              disabled={!d.inMonth || isPast}
                              className={`py-1.5 text-[10px] font-bold transition-all
                                ${!d.inMonth || isPast ? "text-slate-200 cursor-default" : ""}
                                ${d.inMonth && !isPast && !isSelected ? "hover:bg-blue-50" : ""}
                                ${isSelected ? "text-white rounded-sm" : ""}
                                ${isToday && !isSelected ? "underline" : ""}
                                ${d.inMonth && !isPast && dow === 0 && !isSelected ? "text-red-400" : ""}
                                ${d.inMonth && !isPast && dow === 6 && !isSelected ? "text-blue-500" : ""}
                              `}
                              style={
                                isSelected ? { backgroundColor: BRAND } : {}
                              }
                            >
                              {d.day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-lg">
                    <div
                      className={`grid grid-cols-7 gap-1 ${
                        weekPhase === "exit-left"
                          ? "week-exit-left"
                          : weekPhase === "exit-right"
                            ? "week-exit-right"
                            : weekPhase === "enter-left"
                              ? "week-enter-left"
                              : weekPhase === "enter-right"
                                ? "week-enter-right"
                                : ""
                      }`}
                    >
                      {buildWeekAroundDate(displayedDate).map((d, idx) => {
                        const isSelected = selectedDate === d.date;
                        const isCenter = idx === 3;
                        const isPast = d.date < todayStr;
                        return (
                          <button
                            key={d.date}
                            disabled={isPast}
                            onClick={() => {
                              if (isPast) return;
                              const dir =
                                idx < 3
                                  ? "right"
                                  : idx > 3
                                    ? "left"
                                    : undefined;
                              changeDate(d.date, dir);
                            }}
                            className={`flex flex-col items-center py-2 rounded-lg text-[10px] font-black border transition-colors duration-150 ${
                              isPast
                                ? "bg-slate-50 border-slate-100 text-slate-300 cursor-default"
                                : isSelected
                                  ? "text-white border-[#002561]"
                                  : isCenter && !isSelected
                                    ? "bg-blue-50 border-blue-200 text-blue-700"
                                    : d.isToday
                                      ? "bg-blue-50 border-blue-200 text-blue-700"
                                      : "bg-white border-slate-100 text-slate-500 hover:border-blue-300"
                            }`}
                            style={
                              isSelected && !isPast
                                ? { backgroundColor: BRAND }
                                : {}
                            }
                          >
                            <span className="text-[8px] opacity-70">
                              {d.dayOfWeek}
                            </span>
                            <span>{d.date.slice(8)}</span>
                            {d.isPeak && !isPast && (
                              <span className="text-[7px] text-amber-500 font-bold">
                                성수기
                              </span>
                            )}
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
            </aside>

            {/* 중앙+우측: 운항 현황 (col-span-9) */}
            <section className="col-span-12 lg:col-span-9">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
                  <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
                    {selectedDate} 운항편 판매현황{" "}
                    <span className="text-sm font-bold text-slate-500">
                      (현재기준)
                    </span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-4 sm:px-5 py-3">편명/시간</th>
                        <th className="px-4 sm:px-5 py-3 text-center">L/F</th>
                        <th className="px-4 sm:px-5 py-3 text-center">Pace</th>
                        <th className="px-4 sm:px-5 py-3 text-blue-600">
                          AI 추천
                        </th>
                        <th className="px-4 sm:px-5 py-3">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(() => {
                        const now = new Date();
                        const visibleFlights =
                          selectedDate === todayStr
                            ? flights.filter((f) => {
                                const [hh, mm] = f.time.split(":").map(Number);
                                return (
                                  hh * 60 + mm >=
                                  now.getHours() * 60 + now.getMinutes()
                                );
                              })
                            : flights;
                        if (visibleFlights.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-5 py-8 text-center text-sm text-slate-400 font-bold"
                              >
                                현재 시간 이후 운항편이 없습니다.
                              </td>
                            </tr>
                          );
                        }
                        return visibleFlights.map((f) => {
                          const isSelected = f.id === selectedFlight.id;
                          const paceUp = f.pace.startsWith("+");
                          const rawLabel = aiSuggestionLabel(
                            f.currentPrice,
                            f.aiRecommended,
                          );
                          const aiLabel = appliedFlights.has(`${selectedDate}:${f.id}`)
                            ? { text: "적용 완료", color: "text-green-600" }
                            : rawLabel;
                          const hasCrossAi =
                            !!crossRouteAiPrices[selectedRoute]?.[f.id];
                          return (
                            <tr
                              key={f.id}
                              onClick={() => {
                                goToDetail(f);
                              }}
                              className={`cursor-pointer transition-all hover:bg-blue-50/60 ${
                                isSelected
                                  ? "bg-blue-50/80 border-l-4 border-[#002561]"
                                  : "border-l-4 border-transparent"
                              }`}
                            >
                              <td className="px-4 sm:px-5 py-3 sm:py-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-slate-900 text-sm">
                                    {f.flightNo}
                                  </span>
                                  {hasCrossAi && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-black">
                                      <Sparkles size={8} /> AI 적용
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold">
                                  {f.time} ({f.timeSlot})
                                </div>
                              </td>
                              <td className="px-4 sm:px-5 py-3 sm:py-4">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-16 bg-slate-200 rounded-full h-3 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${lfBarColor(f.lf)}`}
                                      style={{ width: `${f.lf}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-black text-slate-600">
                                    {f.lf}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 sm:px-5 py-3 sm:py-4 text-center">
                                <span
                                  className={`text-[11px] font-black flex items-center justify-center gap-0.5 ${paceUp ? "text-red-500" : "text-blue-500"}`}
                                >
                                  {paceUp ? (
                                    <TrendingUp size={11} />
                                  ) : (
                                    <TrendingDown size={11} />
                                  )}
                                  {f.pace}
                                </span>
                              </td>
                              <td className="px-4 sm:px-5 py-3 sm:py-4 font-black text-[12px]">
                                <span className={aiLabel.color}>
                                  {aiLabel.text}
                                </span>
                              </td>
                              <td className="px-4 sm:px-5 py-3 sm:py-4">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadgeClass(f.status)}`}
                                >
                                  {f.status}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── STEP 2: 좌석배치도 + 운임관리 + 인벤토리 조정 ── */}
        {step === "detail" && (
          <div className="grid grid-cols-12 gap-4 sm:gap-5">
            {/* 뒤로가기 헤더 (full width) */}
            <div className="col-span-12 bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-3">
              <button
                onClick={() => goToList()}
                className="flex items-center gap-1.5 text-slate-500 hover:text-[#002561] font-black text-sm transition-colors"
              >
                <ChevronLeft size={18} /> 운항 목록
              </button>
              <div className="h-5 w-px bg-slate-200" />
              <div>
                <span className="font-black text-slate-800 text-sm">
                  {selectedFlight.flightNo}
                </span>
                <span className="text-slate-400 text-xs font-bold ml-2">
                  {selectedFlight.time} ({selectedFlight.timeSlot}) ·{" "}
                  {selectedFlight.aircraft} · {toDDMMM(selectedDate)}
                </span>
              </div>
              {crossRouteAiPrices[selectedRoute]?.[selectedFlight.id] && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black">
                  <Sparkles size={10} /> AI 전략 적용됨
                </span>
              )}
              <span
                className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadgeClass(selectedFlight.status)}`}
              >
                {selectedFlight.status}
              </span>
            </div>

            {/* 상단 2열: 좌석 배치도(좌) + 등급별 운임 관리(우) */}
            <div className="col-span-12 lg:col-span-5">
              <SeatMap flight={selectedFlight} />
            </div>

            <div className="col-span-12 lg:col-span-7">
              <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 h-full">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                    <LayoutGrid size={16} style={{ color: BRAND }} />
                    좌석 등급별 운임 관리
                    <span className="text-xs font-bold text-slate-400 ml-1 hidden sm:inline">
                      — {selectedFlight.flightNo} ({selectedFlight.time})
                    </span>
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">
                    총 {selectedFlight.totalSeats} Seats
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {selectedFlight.classes.map((cls) => {
                    const rejKey = `${selectedFlight.id}-${cls.code}`;
                    const isRejected = rejectedClasses.has(rejKey);
                    const isConfirmed = confirmedClasses.has(`${selectedDate}:${rejKey}`);
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
                        onEditChange={(v) =>
                          setEditState((e) => (e ? { ...e, value: v } : null))
                        }
                        onToggleStatus={toggleStatus}
                        onDetailAi={(fid, code) => {
                          const c = selectedFlight.classes.find(
                            (c) => c.code === code,
                          );
                          if (c) setAiDetailPopup({ flightId: fid, cls: c });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 하단 전체 너비: 인벤토리 통제 패널 */}
            <div className="col-span-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Profit Analysis */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h2 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 border-b pb-3 uppercase">
                    <BarChart4 size={16} style={{ color: BRAND }} /> Profit
                    Analysis
                  </h2>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase">
                          Revenue
                        </span>
                        <Coins size={13} className="text-blue-400" />
                      </div>
                      <div
                        className="text-xl font-black"
                        style={{ color: BRAND }}
                      >
                        {fmtW(revenue)}
                      </div>
                      <p className="text-[9px] text-blue-400 font-bold mt-1">
                        {soldSeats}석 판매 (L/F {selectedFlight.lf}%)
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase">
                          Cost
                        </span>
                        <Wallet size={13} className="text-slate-400" />
                      </div>
                      <div className="text-xl font-black text-slate-700">
                        {fmtW(cost)}
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                        Operational Expenses
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border-2 border-slate-100 shadow-inner">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase">
                          Margin
                        </span>
                        <span
                          className={`text-sm font-black ${profit >= 0 ? "text-green-600" : "text-red-500"}`}
                        >
                          {margin}%
                        </span>
                      </div>
                      <div
                        className={`text-2xl font-black tracking-tight mb-3 ${profit >= 0 ? "text-slate-800" : "text-red-600"}`}
                      >
                        {fmtW(profit)}
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${profit >= 0 ? "bg-green-500" : "bg-red-400"}`}
                          style={{
                            width: `${Math.min(Math.abs(Number(margin)), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 인벤토리 실시간 통제 확정 */}
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <h2 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 border-b pb-3 uppercase">
                    <Plane size={16} style={{ color: BRAND }} /> 인벤토리 통제
                  </h2>
                  <div className="space-y-3 flex-1">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      AI 추천 운임 및 좌석 수 변경 사항을 시스템에 최종
                      반영합니다.
                    </p>
                    {confirmError && (
                      <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
                        <XCircle size={13} className="shrink-0" />
                        <span>{confirmError}</span>
                      </div>
                    )}
                  </div>
                  <button
                      data-testid="confirm-inventory-btn"
                      onClick={handleConfirmInventory}
                      disabled={confirmLoading}
                      className={`w-full mt-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-60 ${
                        confirmDone
                          ? "bg-green-500 text-white"
                          : confirmError
                            ? "bg-red-500 text-white"
                            : "text-white hover:opacity-90"
                      }`}
                      style={
                        confirmDone || confirmError
                          ? {}
                          : { backgroundColor: BRAND }
                      }
                    >
                      {confirmLoading ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" /> 저장
                          중...
                        </>
                      ) : confirmDone ? (
                        <>
                          <CheckCircle size={15} /> 저장 완료
                        </>
                      ) : confirmError ? (
                        <>
                          <XCircle size={15} /> 저장 실패
                        </>
                      ) : (
                        <>
                          <Plane size={15} /> 인벤토리 실시간 통제 확정
                        </>
                      )}
                    </button>
                </div>

                {/* AI 전략 분석 요청 */}
                <div
                  className="rounded-xl shadow-lg text-white p-4 sm:p-5"
                  style={{ backgroundColor: BRAND }}
                >
                  <h2 className="text-sm font-black mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-sky-300" /> AI 전략 분석
                    요청
                  </h2>
                  <div className="space-y-3">
                    <textarea
                      data-testid="ai-strategy-query"
                      ref={aiRef}
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      className="w-full h-24 p-3 bg-white/10 border border-white/20 rounded-lg text-xs placeholder:text-white/40 focus:bg-white/20 focus:outline-none resize-none font-medium"
                      placeholder="돌발 이슈를 입력하세요&#10;(예: 태풍 보도, 대형 행사, 연휴 등)"
                    />
                    <button
                      data-testid="ai-strategy-submit-btn"
                      onClick={runAi}
                      disabled={aiLoading || !aiQuery.trim()}
                      className="w-full bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-[#002561] font-black py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" /> 분석
                          중...
                        </>
                      ) : (
                        <>
                          <Send size={13} /> AI 전략 분석 시작
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 등급 카드 ─────────────────────────────────────────────────────────────────
function ClassEditCard({
  cls,
  flightId,
  editState,
  isRejected,
  isConfirmed,
  onStartEdit,
  onCommit,
  onCancel,
  onEditChange,
  onToggleStatus,
  onDetailAi,
}: {
  cls: DashboardClass;
  flightId: string;
  editState: EditState | null;
  isRejected: boolean;
  isConfirmed: boolean;
  onStartEdit: (
    fid: string,
    code: string,
    field: "price" | "seats",
    cur: number,
  ) => void;
  onCommit: () => void;
  onCancel: () => void;
  onEditChange: (v: string) => void;
  onToggleStatus: (fid: string, code: string) => void;
  onDetailAi: (fid: string, code: string) => void;
}) {
  const soldPct = cls.seats > 0 ? Math.round((cls.sold / cls.seats) * 100) : 0;
  const isEditingPrice =
    editState?.flightId === flightId &&
    editState.classCode === cls.code &&
    editState.field === "price";
  const isEditingSeats =
    editState?.flightId === flightId &&
    editState.classCode === cls.code &&
    editState.field === "seats";

  const isSoldOut = cls.status === "Sold Out";
  const isClosed = cls.status === "Closed";
  const isPrestige = cls.name.includes("프레스티지");

  // Sold Out: 운임·AI 비활성, 좌석은 증가만 허용
  // Closed: 운임·좌석 모두 잠금
  const priceLocked = isClosed || isSoldOut;
  const aiLocked = isSoldOut || isClosed;
  const seatsLocked = isPrestige || isClosed;
  // Sold Out일 때는 좌석 증가 허용 (감소 불가는 commitEdit에서 처리)
  const seatsEditable = isSoldOut && !isPrestige;
  const toggleLocked = isSoldOut;

  const statusColor =
    cls.status === "Open"
      ? "bg-green-100 text-green-600"
      : cls.status === "Sold Out"
        ? "bg-red-200 text-red-700 cursor-not-allowed"
        : "bg-red-100 text-red-600";

  const hasDiff =
    cls.aiPrice !== cls.price && !isRejected && !isConfirmed && !aiLocked;
  const aiUp = cls.aiPrice > cls.price;
  const aiDiffPct =
    cls.price > 0
      ? Math.round(((cls.aiPrice - cls.price) / cls.price) * 100)
      : 0;

  const canEditSeats = seatsEditable || !seatsLocked;

  // 등급 왼쪽 accent 색
  const accentColor = isPrestige
    ? "#f59e0b"
    : cls.name.includes("정상")
      ? "#3b82f6"
      : cls.name.includes("할인")
        ? "#14b8a6"
        : "#8b5cf6";

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isSoldOut
          ? "border-red-200 bg-red-50"
          : isClosed
            ? "border-slate-200 bg-slate-50 opacity-80"
            : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
      }`}
      style={{
        boxShadow:
          isSoldOut || isClosed ? undefined : "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* accent stripe */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: accentColor, opacity: isClosed ? 0.3 : 1 }}
      />

      <div className="p-3">
        {/* ── 상단: 등급명 · 상태 · 좌석수 · 판매율 바 ── */}
        <div className="flex items-start gap-2 mb-2.5">
          {/* 등급명 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-black text-slate-800">{cls.name}</h4>
              <button
                onClick={() =>
                  !toggleLocked && onToggleStatus(flightId, cls.code)
                }
                disabled={toggleLocked}
                className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 transition-all ${statusColor}`}
                title={
                  isSoldOut
                    ? "매진 — 상태 변경 불가"
                    : "클릭하여 Open/Closed 전환"
                }
              >
                {cls.status}
              </button>
            </div>
            {/* 판매율 바 */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-700 rounded-full"
                  style={{
                    width: `${soldPct}%`,
                    backgroundColor: accentColor,
                    opacity: isClosed ? 0.4 : 1,
                  }}
                />
              </div>
              <span
                className="text-[9px] font-bold shrink-0"
                style={{ color: accentColor }}
              >
                {soldPct}%
              </span>
            </div>
          </div>

          {/* 판매 / 전체 좌석 */}
          <div className="shrink-0 text-right">
            <div className="text-[8px] text-slate-400 font-bold leading-none mb-0.5">
              판매/전체
            </div>
            {isEditingSeats ? (
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <input
                  type="number"
                  value={editState!.value}
                  onChange={(e) => onEditChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommit();
                    if (e.key === "Escape") onCancel();
                  }}
                  className="border-2 border-blue-500 rounded-lg px-2 py-1 text-center text-sm font-mono font-black focus:outline-none focus:ring-2 focus:ring-blue-300"
                  style={{
                    width: `${Math.max(4, editState!.value.length * 0.9 + 1.5)}rem`,
                  }}
                  autoFocus
                />
                <button
                  onClick={onCommit}
                  className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 rounded-lg transition-colors"
                >
                  <CheckCircle size={14} />
                </button>
                <button
                  onClick={onCancel}
                  className="p-1 bg-red-50 hover:bg-red-100 text-red-400 rounded-lg transition-colors"
                >
                  <XIcon size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-baseline gap-0.5 justify-end">
                <span className="text-xs font-black text-slate-700">
                  {cls.sold}
                </span>
                <span className="text-[9px] text-slate-400"> / </span>
                <button
                  onClick={() =>
                    canEditSeats &&
                    onStartEdit(flightId, cls.code, "seats", cls.seats)
                  }
                  disabled={!canEditSeats}
                  className={`text-xs font-black px-1.5 py-0.5 rounded-md transition-all ${
                    !canEditSeats
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-white hover:opacity-80 shadow-sm"
                  }`}
                  style={canEditSeats ? { backgroundColor: accentColor } : {}}
                  title={
                    isPrestige
                      ? "프레스티지 좌석 수 변경 불가"
                      : isClosed
                        ? "Closed — 좌석 수 변경 불가"
                        : isSoldOut
                          ? "매진 — 좌석 수 늘리기만 가능"
                          : "클릭하여 수정"
                  }
                >
                  {cls.seats}석
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 하단: 현재 운임 (좌) · AI 추천 (우) ── */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* 현재 운임 */}
          <div
            className={`rounded-lg px-2.5 py-2 ${isSoldOut || isClosed ? "bg-slate-100" : "bg-slate-50 border border-slate-100"}`}
          >
            <div className="text-[8px] text-slate-400 font-bold uppercase mb-0.5">
              현재 운임
            </div>
            {isEditingPrice ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={editState!.value}
                  onChange={(e) => onEditChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommit();
                    if (e.key === "Escape") onCancel();
                  }}
                  className="w-full border border-blue-400 rounded px-1.5 py-1 text-right text-xs font-mono focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={onCommit}
                  className="text-emerald-600 shrink-0"
                >
                  <CheckCircle size={13} />
                </button>
                <button onClick={onCancel} className="text-red-400 shrink-0">
                  <XIcon size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() =>
                  !priceLocked &&
                  onStartEdit(flightId, cls.code, "price", cls.price)
                }
                disabled={priceLocked}
                className={`font-mono font-black text-sm transition-colors w-full text-left leading-tight ${
                  priceLocked
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-800 hover:text-blue-600"
                }`}
                title={
                  isSoldOut
                    ? "매진 — 운임 수정 불가"
                    : isClosed
                      ? "Closed — 운임 수정 불가"
                      : "클릭하여 수정"
                }
              >
                {fmtW(cls.price)}
              </button>
            )}
            {!priceLocked && (
              <div className="text-[8px] text-slate-300 mt-0.5">
                클릭하여 수정
              </div>
            )}
          </div>

          {/* AI 추천 */}
          <div
            className={`rounded-lg px-2.5 py-2 ${
              hasDiff
                ? "bg-indigo-50 border border-indigo-100"
                : "bg-slate-50 border border-slate-100"
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Sparkles
                size={8}
                className={hasDiff ? "text-indigo-500" : "text-slate-300"}
              />
              <span
                className={`text-[8px] font-bold uppercase ${hasDiff ? "text-indigo-500" : "text-slate-300"}`}
              >
                AI 추천
              </span>
            </div>
            {hasDiff ? (
              <>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-mono font-black text-sm text-indigo-700 leading-tight">
                    {fmtW(cls.aiPrice)}
                  </span>
                  <span
                    className={`text-[9px] font-black flex items-center gap-0.5 shrink-0 ${aiUp ? "text-rose-500" : "text-teal-600"}`}
                  >
                    {aiUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {aiUp ? "+" : ""}
                    {aiDiffPct}%
                  </span>
                </div>
                <button
                  onClick={() => onDetailAi(flightId, cls.code)}
                  className="mt-1 w-full text-[8px] bg-indigo-600 text-white py-1 rounded-md font-bold hover:bg-indigo-700 transition-colors"
                >
                  상세 보기
                </button>
              </>
            ) : isRejected ? (
              <div className="flex items-center gap-1 mt-1">
                <XIcon size={9} className="text-slate-400" />
                <span className="text-[9px] text-slate-400 font-bold">
                  거부됨
                </span>
              </div>
            ) : isSoldOut || isClosed ? (
              <span className="text-[9px] text-slate-300 font-bold">
                비활성
              </span>
            ) : (
              <span className="text-[9px] text-slate-300 font-bold">
                추천 없음
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 기내 좌석 배치도 (세로형) ─────────────────────────────────────────────────
type SeatInfo = {
  sold: boolean;
  seatId: string;
  clsName: string;
  clsCode: string;
  price: number;
  closed: boolean;
  rowNo: number;
  colLabel: string;
};

function SeatBtn({
  seat,
  isPrestige,
}: {
  seat: SeatInfo;
  isPrestige: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const baseColor = (() => {
    if (seat.closed) return seat.sold ? "#94a3b8" : "#f1f5f9";
    if (isPrestige) return seat.sold ? "#f59e0b" : "#fef3c7";
    if (seat.clsName.includes("정상")) return seat.sold ? "#3b82f6" : "#dbeafe";
    if (seat.clsName.includes("할인")) return seat.sold ? "#14b8a6" : "#ccfbf1";
    return seat.sold ? "#8b5cf6" : "#ede9fe";
  })();
  const borderColor = (() => {
    if (seat.closed) return seat.sold ? "#64748b" : "#cbd5e1";
    if (isPrestige) return seat.sold ? "#d97706" : "#fcd34d";
    if (seat.clsName.includes("정상")) return seat.sold ? "#2563eb" : "#93c5fd";
    if (seat.clsName.includes("할인")) return seat.sold ? "#0d9488" : "#5eead4";
    return seat.sold ? "#7c3aed" : "#c4b5fd";
  })();

  const sW = isPrestige ? 32 : 24;
  const sH = isPrestige ? 26 : 20;

  const tipText = seat.closed
    ? `${seat.seatId} · 판매중단`
    : `${seat.seatId} · ${seat.clsName} · ${seat.price.toLocaleString()}원 · ${seat.sold ? "예약됨" : "여석"}`;

  return (
    <div className="relative" style={{ opacity: seat.closed ? 0.5 : 1 }}>
      <button
        ref={ref}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{
          width: sW,
          height: sH,
          backgroundColor: baseColor,
          border: `1.5px solid ${borderColor}`,
          borderRadius: isPrestige ? 4 : 3,
        }}
        className="transition-transform duration-100 hover:scale-125 hover:z-20 relative block"
      />
      {visible && (
        <div
          className="absolute z-50 pointer-events-none whitespace-nowrap"
          style={{
            bottom: "calc(100% + 5px)",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-slate-900 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xl">
            {tipText}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
              style={{
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "4px solid #0f172a",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SeatMap({ flight }: { flight: DashboardFlight }) {
  const prestige = flight.classes.find((c) => c.name.includes("프레스티지"));
  const ecoClasses = flight.classes.filter(
    (c) => !c.name.includes("프레스티지"),
  );

  // 세로형: 각 클래스를 섹션으로 나눠 위→아래로 배치
  type Section = {
    cls: DashboardClass;
    startRow: number;
    rows: SeatInfo[][];
    isPrestige: boolean;
  };
  const sections: Section[] = [];
  let globalRow = 1;

  const buildSection = (
    cls: DashboardClass,
    colsPerSide: number,
    isP: boolean,
  ): Section => {
    const totalCols = colsPerSide * 2;
    const numRows = Math.ceil(cls.seats / totalCols);
    const closed = cls.status === "Closed";
    const rows: SeatInfo[][] = [];
    let seatNum = 0;
    for (let r = 0; r < numRows; r++) {
      const row: SeatInfo[] = [];
      for (let c = 0; c < totalCols; c++) {
        const colLabel = "ABCDEF"[c];
        if (seatNum < cls.seats) {
          row.push({
            sold: seatNum < cls.sold,
            seatId: `${globalRow + r}${colLabel}`,
            clsName: cls.name,
            clsCode: cls.code,
            price: cls.price,
            closed,
            rowNo: globalRow + r,
            colLabel,
          });
          seatNum++;
        } else {
          row.push({
            sold: false,
            seatId: "",
            clsName: cls.name,
            clsCode: cls.code,
            price: 0,
            closed,
            rowNo: globalRow + r,
            colLabel,
          });
        }
      }
      rows.push(row);
    }
    const sec: Section = { cls, startRow: globalRow, rows, isPrestige: isP };
    globalRow += numRows;
    return sec;
  };

  if (prestige) sections.push(buildSection(prestige, 2, true));
  for (const cls of ecoClasses) sections.push(buildSection(cls, 3, false));

  // 범례
  const legendItems = flight.classes.map((cls) => {
    const isP = cls.name.includes("프레스티지");
    return {
      label: isP ? "프레스티지" : cls.name.replace("일반석 ", ""),
      cls,
      filledColor: isP
        ? "#f59e0b"
        : cls.name.includes("정상")
          ? "#3b82f6"
          : cls.name.includes("할인")
            ? "#14b8a6"
            : "#8b5cf6",
      emptyColor: isP
        ? "#fef3c7"
        : cls.name.includes("정상")
          ? "#dbeafe"
          : cls.name.includes("할인")
            ? "#ccfbf1"
            : "#ede9fe",
    };
  });

  const RowLine = ({
    row,
    colsPerSide,
    isPrestige: isP,
  }: {
    row: SeatInfo[];
    colsPerSide: number;
    isPrestige: boolean;
  }) => (
    <div className="flex items-center" style={{ gap: 4 }}>
      <span
        className="text-[8px] text-slate-300 font-bold text-right shrink-0"
        style={{ width: 18 }}
      >
        {row[0]?.rowNo ?? ""}
      </span>
      <div className="flex" style={{ gap: 4 }}>
        {row
          .slice(0, colsPerSide)
          .map((seat, ci) =>
            seat.seatId ? (
              <SeatBtn key={ci} seat={seat} isPrestige={isP} />
            ) : (
              <div
                key={ci}
                style={{ width: isP ? 32 : 24, height: isP ? 26 : 20 }}
              />
            ),
          )}
      </div>
      <div style={{ width: isP ? 16 : 12 }} />
      <div className="flex" style={{ gap: 4 }}>
        {row
          .slice(colsPerSide)
          .map((seat, ci) =>
            seat.seatId ? (
              <SeatBtn key={ci} seat={seat} isPrestige={isP} />
            ) : (
              <div
                key={ci}
                style={{ width: isP ? 32 : 24, height: isP ? 26 : 20 }}
              />
            ),
          )}
      </div>
    </div>
  );

  const ColLabels = ({
    labels,
    sW,
    sH,
    isP,
  }: {
    labels: string[];
    sW: number;
    sH: number;
    isP: boolean;
  }) => {
    const half = labels.length / 2;
    return (
      <div className="flex items-center" style={{ gap: 4 }}>
        <div style={{ width: 18 }} />
        <div className="flex" style={{ gap: 4 }}>
          {labels.slice(0, half).map((l) => (
            <div
              key={l}
              style={{ width: sW, height: sH }}
              className="flex items-center justify-center text-[9px] font-black text-slate-400"
            >
              {l}
            </div>
          ))}
        </div>
        <div style={{ width: isP ? 16 : 12 }} />
        <div className="flex" style={{ gap: 4 }}>
          {labels.slice(half).map((l) => (
            <div
              key={l}
              style={{ width: sW, height: sH }}
              className="flex items-center justify-center text-[9px] font-black text-slate-400"
            >
              {l}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      {/* 헤더 */}
      <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5 mb-3">
        <Plane size={14} style={{ color: "#002561" }} />
        기내 좌석 배치도
        <span className="text-[10px] font-bold text-slate-400 ml-1">
          {flight.aircraft} · {flight.totalSeats}석
        </span>
      </h3>

      {/* 본문: 기내도 + 우측 범례 */}
      <div className="flex gap-4 items-start">
        {/* 세로형 기내도 */}
        <div className="relative">
          <div className="relative bg-slate-50 rounded-[2rem] border-2 border-slate-200 px-4 pt-6 pb-5 inline-block">
            {/* 기수 */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: "14px solid transparent",
                borderRight: "14px solid transparent",
                borderBottom: "14px solid #cbd5e1",
              }}
            />
            <div
              className="absolute -top-[10px] left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: "12px solid transparent",
                borderRight: "12px solid transparent",
                borderBottom: "12px solid #f8fafc",
              }}
            />

            <div className="space-y-1">
              {sections.map((sec, si) => {
                const colsPerSide = sec.isPrestige ? 2 : 3;
                const labels = sec.isPrestige
                  ? ["A", "B", "C", "D"]
                  : ["A", "B", "C", "D", "E", "F"];
                const sW = sec.isPrestige ? 32 : 24;

                return (
                  <div key={sec.cls.code}>
                    {/* 구역 라벨 */}
                    {si === 0 && (
                      <div className="text-center mb-1">
                        <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">
                          PRESTIGE
                        </span>
                      </div>
                    )}
                    {si === 1 && (
                      <>
                        <div className="flex items-center gap-1 my-2">
                          <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                          <span className="text-[8px] font-black text-slate-400 px-1">
                            ECONOMY
                          </span>
                          <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                        </div>
                        <ColLabels
                          labels={labels}
                          sW={sW}
                          sH={14}
                          isP={false}
                        />
                      </>
                    )}
                    {si > 1 && (
                      <div className="flex items-center gap-1 my-1">
                        <div
                          className={`flex-1 border-t border-dashed ${
                            sec.cls.name.includes("할인")
                              ? "border-teal-300"
                              : "border-violet-300"
                          }`}
                        />
                      </div>
                    )}
                    {si === 0 && (
                      <ColLabels labels={labels} sW={sW} sH={18} isP />
                    )}

                    <div className="space-y-1">
                      {sec.rows.map((row, ri) => (
                        <RowLine
                          key={ri}
                          row={row}
                          colsPerSide={colsPerSide}
                          isPrestige={sec.isPrestige}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 꼬리 */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-3 bg-slate-200 rounded-b-full" />
          </div>
        </div>

        {/* 우측 범례 */}
        <div className="shrink-0 space-y-3 pt-1">
          <div className="space-y-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">
              좌석 상태
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 rounded-sm bg-slate-500" />
              <span className="text-[10px] text-slate-600 font-bold">
                예약됨
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 rounded-sm bg-white border border-slate-300" />
              <span className="text-[10px] text-slate-600 font-bold">여석</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 rounded-sm bg-slate-200 opacity-50" />
              <span className="text-[10px] text-slate-400 font-bold">
                판매중단
              </span>
            </div>
          </div>
          <div className="border-t border-slate-100" />
          <div className="space-y-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">
              좌석 등급
            </p>
            {legendItems.map((item) => {
              const lf =
                item.cls.seats > 0
                  ? Math.round((item.cls.sold / item.cls.seats) * 100)
                  : 0;
              const spare = item.cls.seats - item.cls.sold;
              return (
                <div
                  key={item.label}
                  className="space-y-0.5 p-2 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3.5 h-3 rounded-sm"
                        style={{ backgroundColor: item.filledColor }}
                      />
                      <span className="text-[10px] font-black text-slate-700">
                        {item.label}
                      </span>
                    </div>
                    {item.cls.status === "Closed" && (
                      <span className="text-[8px] bg-slate-200 text-slate-500 px-1 rounded font-bold">
                        C
                      </span>
                    )}
                    {item.cls.status === "Sold Out" && (
                      <span className="text-[8px] bg-red-100 text-red-500 px-1 rounded font-bold">
                        S
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: item.emptyColor, minWidth: 48 }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${lf}%`,
                          backgroundColor: item.filledColor,
                        }}
                      />
                    </div>
                    <span
                      className="text-[9px] font-black"
                      style={{ color: item.filledColor }}
                    >
                      {lf}%
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-semibold">
                    잔여 {spare} / {item.cls.seats}석
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
