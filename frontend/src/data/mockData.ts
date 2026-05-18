export const ROUTES = ["GMP-CJU", "GMP-PUS", "ICN-CJU", "ICN-PUS", "GMP-TAE"];

export const BOOKING_CLASSES = ["Y", "B", "M", "K", "H", "Q"];

export interface Flight {
  id: string;
  route: string;
  flightNo: string;
  date: string;
  departureTime: string;
  totalSeats: number;
  bookedSeats: number;
}

export interface FareClass {
  flightId: string;
  bookingClass: string;
  fare: number;
  availableSeats: number;
  bookedSeats: number;
  status: "open" | "closed" | "waitlist";
}

export interface AiRecommendation {
  id: string;
  flightId: string;
  bookingClass: string;
  currentFare: number;
  recommendedFare: number;
  confidence: number;
  reason: string;
  predictedLoadFactor: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface CompetitorPrice {
  route: string;
  airline: string;
  bookingClass: string;
  fare: number;
  date: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  bookings: number;
}

export const flights: Flight[] = [
  { id: "F001", route: "GMP-CJU", flightNo: "KE1201", date: "2026-05-20", departureTime: "07:00", totalSeats: 180, bookedSeats: 142 },
  { id: "F002", route: "GMP-CJU", flightNo: "KE1203", date: "2026-05-20", departureTime: "10:30", totalSeats: 180, bookedSeats: 98 },
  { id: "F003", route: "GMP-CJU", flightNo: "KE1205", date: "2026-05-20", departureTime: "14:00", totalSeats: 180, bookedSeats: 160 },
  { id: "F004", route: "GMP-PUS", flightNo: "KE1401", date: "2026-05-20", departureTime: "08:00", totalSeats: 150, bookedSeats: 87 },
  { id: "F005", route: "ICN-CJU", flightNo: "OZ8901", date: "2026-05-20", departureTime: "09:00", totalSeats: 200, bookedSeats: 173 },
  { id: "F006", route: "GMP-CJU", flightNo: "KE1207", date: "2026-05-21", departureTime: "07:00", totalSeats: 180, bookedSeats: 65 },
  { id: "F007", route: "GMP-PUS", flightNo: "KE1403", date: "2026-05-21", departureTime: "11:00", totalSeats: 150, bookedSeats: 110 },
];

export const fareClasses: FareClass[] = [
  { flightId: "F001", bookingClass: "Y", fare: 158000, availableSeats: 10, bookedSeats: 10, status: "closed" },
  { flightId: "F001", bookingClass: "B", fare: 128000, availableSeats: 14, bookedSeats: 14, status: "closed" },
  { flightId: "F001", bookingClass: "M", fare: 108000, availableSeats: 20, bookedSeats: 20, status: "closed" },
  { flightId: "F001", bookingClass: "K", fare: 88000, availableSeats: 28, bookedSeats: 26, status: "open" },
  { flightId: "F001", bookingClass: "H", fare: 72000, availableSeats: 48, bookedSeats: 46, status: "open" },
  { flightId: "F001", bookingClass: "Q", fare: 58000, availableSeats: 60, bookedSeats: 26, status: "open" },
  { flightId: "F002", bookingClass: "Y", fare: 158000, availableSeats: 10, bookedSeats: 4, status: "open" },
  { flightId: "F002", bookingClass: "B", fare: 128000, availableSeats: 14, bookedSeats: 8, status: "open" },
  { flightId: "F002", bookingClass: "M", fare: 108000, availableSeats: 20, bookedSeats: 12, status: "open" },
  { flightId: "F002", bookingClass: "K", fare: 88000, availableSeats: 28, bookedSeats: 18, status: "open" },
  { flightId: "F002", bookingClass: "H", fare: 72000, availableSeats: 48, bookedSeats: 36, status: "open" },
  { flightId: "F002", bookingClass: "Q", fare: 58000, availableSeats: 60, bookedSeats: 20, status: "open" },
  { flightId: "F003", bookingClass: "Y", fare: 158000, availableSeats: 10, bookedSeats: 10, status: "closed" },
  { flightId: "F003", bookingClass: "B", fare: 128000, availableSeats: 14, bookedSeats: 14, status: "closed" },
  { flightId: "F003", bookingClass: "M", fare: 108000, availableSeats: 20, bookedSeats: 20, status: "closed" },
  { flightId: "F003", bookingClass: "K", fare: 88000, availableSeats: 28, bookedSeats: 28, status: "closed" },
  { flightId: "F003", bookingClass: "H", fare: 72000, availableSeats: 48, bookedSeats: 48, status: "waitlist" },
  { flightId: "F003", bookingClass: "Q", fare: 58000, availableSeats: 60, bookedSeats: 40, status: "open" },
];

export const aiRecommendations: AiRecommendation[] = [
  {
    id: "REC001",
    flightId: "F002",
    bookingClass: "Q",
    currentFare: 58000,
    recommendedFare: 48000,
    confidence: 87,
    reason: "출발 5일 전 저조한 탑승률(54%). 수요 탄력성 분석 결과 가격 인하 시 Load Factor 75% 달성 예상.",
    predictedLoadFactor: 75,
    status: "pending",
    createdAt: "2026-05-15T09:30:00Z",
  },
  {
    id: "REC002",
    flightId: "F003",
    bookingClass: "Q",
    currentFare: 58000,
    recommendedFare: 72000,
    confidence: 92,
    reason: "상위 클래스 전체 매진. 잔여 Q클래스 수요 집중 예상. 경쟁사 대비 14% 낮은 현행 운임.",
    predictedLoadFactor: 95,
    status: "pending",
    createdAt: "2026-05-15T09:32:00Z",
  },
  {
    id: "REC003",
    flightId: "F006",
    bookingClass: "H",
    currentFare: 72000,
    recommendedFare: 55000,
    confidence: 78,
    reason: "내일 출발 편 탑승률 36%로 매우 저조. 경쟁사 동일 시간대 운임 53,000원 대비 높은 수준.",
    predictedLoadFactor: 68,
    status: "pending",
    createdAt: "2026-05-15T09:35:00Z",
  },
  {
    id: "REC004",
    flightId: "F005",
    bookingClass: "K",
    currentFare: 88000,
    recommendedFare: 96000,
    confidence: 83,
    reason: "ICN-CJU 노선 주말 전 높은 수요. 현재 탑승률 86.5%. 수요 예측 모델 기준 인상 여력 있음.",
    predictedLoadFactor: 90,
    status: "approved",
    createdAt: "2026-05-15T08:10:00Z",
  },
  {
    id: "REC005",
    flightId: "F004",
    bookingClass: "M",
    currentFare: 108000,
    recommendedFare: 88000,
    confidence: 71,
    reason: "GMP-PUS 노선 탑승률 58%. 비성수기 패턴 감지. 가격 민감 고객층 유입 필요.",
    predictedLoadFactor: 72,
    status: "rejected",
    createdAt: "2026-05-15T07:50:00Z",
  },
];

export const competitorPrices: CompetitorPrice[] = [
  // GMP-CJU — KE 기준: F=313000, C=190000, Y=121000, V=71000
  { route: "GMP-CJU", airline: "아시아나항공", bookingClass: "F", fare: 298000, date: "2026-05-20" },
  { route: "GMP-CJU", airline: "아시아나항공", bookingClass: "C", fare: 178000, date: "2026-05-20" },
  { route: "GMP-CJU", airline: "아시아나항공", bookingClass: "Y", fare: 115000, date: "2026-05-20" },
  { route: "GMP-CJU", airline: "아시아나항공", bookingClass: "V", fare: 67000, date: "2026-05-20" },
  { route: "GMP-CJU", airline: "제주항공",   bookingClass: "Y", fare: 98000,  date: "2026-05-20" },
  { route: "GMP-CJU", airline: "제주항공",   bookingClass: "V", fare: 52000,  date: "2026-05-20" },
  { route: "GMP-CJU", airline: "진에어",     bookingClass: "Y", fare: 95000,  date: "2026-05-20" },
  { route: "GMP-CJU", airline: "진에어",     bookingClass: "V", fare: 49000,  date: "2026-05-20" },
  { route: "GMP-CJU", airline: "에어부산",   bookingClass: "Y", fare: 92000,  date: "2026-05-20" },
  { route: "GMP-CJU", airline: "에어부산",   bookingClass: "V", fare: 47000,  date: "2026-05-20" },
  // GMP-PUS — KE 기준: F=245000, C=149000, Y=95000, V=56000
  { route: "GMP-PUS", airline: "아시아나항공", bookingClass: "F", fare: 232000, date: "2026-05-20" },
  { route: "GMP-PUS", airline: "아시아나항공", bookingClass: "C", fare: 140000, date: "2026-05-20" },
  { route: "GMP-PUS", airline: "아시아나항공", bookingClass: "Y", fare: 90000,  date: "2026-05-20" },
  { route: "GMP-PUS", airline: "아시아나항공", bookingClass: "V", fare: 52000,  date: "2026-05-20" },
  { route: "GMP-PUS", airline: "제주항공",   bookingClass: "Y", fare: 76000,  date: "2026-05-20" },
  { route: "GMP-PUS", airline: "제주항공",   bookingClass: "V", fare: 40000,  date: "2026-05-20" },
  { route: "GMP-PUS", airline: "진에어",     bookingClass: "Y", fare: 74000,  date: "2026-05-20" },
  { route: "GMP-PUS", airline: "진에어",     bookingClass: "V", fare: 38000,  date: "2026-05-20" },
  { route: "GMP-PUS", airline: "에어부산",   bookingClass: "Y", fare: 72000,  date: "2026-05-20" },
  { route: "GMP-PUS", airline: "에어부산",   bookingClass: "V", fare: 37000,  date: "2026-05-20" },
  // ICN-CJU — KE 기준: F=299000, C=181000, Y=116000, V=68000
  { route: "ICN-CJU", airline: "아시아나항공", bookingClass: "F", fare: 285000, date: "2026-05-20" },
  { route: "ICN-CJU", airline: "아시아나항공", bookingClass: "C", fare: 170000, date: "2026-05-20" },
  { route: "ICN-CJU", airline: "아시아나항공", bookingClass: "Y", fare: 110000, date: "2026-05-20" },
  { route: "ICN-CJU", airline: "아시아나항공", bookingClass: "V", fare: 64000,  date: "2026-05-20" },
  { route: "ICN-CJU", airline: "제주항공",   bookingClass: "Y", fare: 94000,  date: "2026-05-20" },
  { route: "ICN-CJU", airline: "제주항공",   bookingClass: "V", fare: 50000,  date: "2026-05-20" },
  { route: "ICN-CJU", airline: "진에어",     bookingClass: "Y", fare: 91000,  date: "2026-05-20" },
  { route: "ICN-CJU", airline: "진에어",     bookingClass: "V", fare: 47000,  date: "2026-05-20" },
  { route: "ICN-CJU", airline: "에어부산",   bookingClass: "Y", fare: 88000,  date: "2026-05-20" },
  { route: "ICN-CJU", airline: "에어부산",   bookingClass: "V", fare: 45000,  date: "2026-05-20" },
  // ICN-PUS — KE 기준: F=239000, C=145000, Y=93000, V=55000
  { route: "ICN-PUS", airline: "아시아나항공", bookingClass: "F", fare: 228000, date: "2026-05-20" },
  { route: "ICN-PUS", airline: "아시아나항공", bookingClass: "C", fare: 136000, date: "2026-05-20" },
  { route: "ICN-PUS", airline: "아시아나항공", bookingClass: "Y", fare: 88000,  date: "2026-05-20" },
  { route: "ICN-PUS", airline: "아시아나항공", bookingClass: "V", fare: 51000,  date: "2026-05-20" },
  { route: "ICN-PUS", airline: "제주항공",   bookingClass: "Y", fare: 75000,  date: "2026-05-20" },
  { route: "ICN-PUS", airline: "제주항공",   bookingClass: "V", fare: 39000,  date: "2026-05-20" },
  { route: "ICN-PUS", airline: "진에어",     bookingClass: "Y", fare: 73000,  date: "2026-05-20" },
  { route: "ICN-PUS", airline: "진에어",     bookingClass: "V", fare: 38000,  date: "2026-05-20" },
  // GMP-TAE — KE 기준: F=218000, C=132000, Y=84000, V=50000
  { route: "GMP-TAE", airline: "아시아나항공", bookingClass: "F", fare: 207000, date: "2026-05-20" },
  { route: "GMP-TAE", airline: "아시아나항공", bookingClass: "C", fare: 124000, date: "2026-05-20" },
  { route: "GMP-TAE", airline: "아시아나항공", bookingClass: "Y", fare: 80000,  date: "2026-05-20" },
  { route: "GMP-TAE", airline: "아시아나항공", bookingClass: "V", fare: 46000,  date: "2026-05-20" },
  { route: "GMP-TAE", airline: "진에어",     bookingClass: "Y", fare: 68000,  date: "2026-05-20" },
  { route: "GMP-TAE", airline: "진에어",     bookingClass: "V", fare: 36000,  date: "2026-05-20" },
  { route: "GMP-TAE", airline: "티웨이항공", bookingClass: "Y", fare: 65000,  date: "2026-05-20" },
  { route: "GMP-TAE", airline: "티웨이항공", bookingClass: "V", fare: 34000,  date: "2026-05-20" },
];

export const revenueHistory: RevenueDataPoint[] = [
  { date: "5/8", revenue: 42800000, bookings: 412 },
  { date: "5/9", revenue: 38500000, bookings: 378 },
  { date: "5/10", revenue: 51200000, bookings: 498 },
  { date: "5/11", revenue: 47900000, bookings: 461 },
  { date: "5/12", revenue: 63400000, bookings: 612 },
  { date: "5/13", revenue: 71200000, bookings: 687 },
  { date: "5/14", revenue: 58700000, bookings: 563 },
  { date: "5/15", revenue: 44300000, bookings: 425 },
];

// ── 대시보드 전용 타입 ──────────────────────────────────────────────────────
export type DashboardClassStatus = "Open" | "Closed" | "Sold Out";
export type FlightStatus = "수요 급증" | "안정적" | "수요 저조" | "매진임박";

export interface DashboardClass {
  name: string;
  code: string;
  seats: number;       // 전체 좌석
  sold: number;        // 판매 좌석
  price: number;       // 현재 운임
  aiPrice: number;     // AI 추천 운임
  status: DashboardClassStatus;
}

export interface DashboardFlight {
  id: string;
  time: string;
  timeSlot: "아침" | "오전" | "오후" | "저녁";
  status: FlightStatus;
  lf: number;          // Load Factor (%)
  pace: string;        // 예약 페이스 (전주 대비)
  currentPrice: number;
  aiRecommended: number;
  baseCost: number;
  classes: DashboardClass[];
  reason: string;      // AI 분석 근거
}

export interface WeekDay {
  date: string;        // "2026-05-15"
  label: string;       // "15일"
  dayOfWeek: string;   // "목"
  isToday: boolean;
  isPeak: boolean;     // 성수기 여부
}

// 기준일로부터 7일치 날짜 생성
export function buildWeekDays(baseDate: Date): WeekDay[] {
  const days: WeekDay[] = [];
  const dow = ["일", "월", "화", "수", "목", "금", "토"];
  const peakMonths = [1, 7, 8, 12]; // 1월 설날, 7~8월 여름, 12월 연말
  for (let i = 0; i < 7; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: `${d.getDate()}일`,
      dayOfWeek: dow[d.getDay()],
      isToday: i === 0,
      isPeak: peakMonths.includes(d.getMonth() + 1),
    });
  }
  return days;
}

export const KE_DOMESTIC_ROUTES = [
  "GMP-CJU", "GMP-PUS", "GMP-CJJ", "GMP-TAE", "GMP-KWJ",
  "ICN-CJU", "ICN-PUS", "GMP-KPO", "GMP-RSU",
];

// B737-900: 프레스티지 8석 / 일반석 정상 30석 / 일반석 할인 85석 / 일반석 특가 50석 = 173석
export function buildDashboardFlights(route: string): DashboardFlight[] {
  const routeMultiplier: Record<string, number> = {
    "GMP-CJU": 1.15, "ICN-CJU": 1.1, "GMP-PUS": 0.9,
    "GMP-CJJ": 0.85, "GMP-TAE": 0.8, "GMP-KWJ": 0.75,
    "ICN-PUS": 0.88, "GMP-KPO": 0.78, "GMP-RSU": 0.72,
  };
  const mul = routeMultiplier[route] ?? 1.0;
  const base = Math.round(85000 * mul);

  return [
    {
      id: "KE1201", time: "07:30", timeSlot: "아침", status: "수요 급증",
      lf: 88, pace: "+12%",
      currentPrice: Math.round(base * 1.24),
      aiRecommended: Math.round(base * 1.39),
      baseCost: Math.round(11500000 * mul),
      classes: [
        { name: "프레스티지", code: "C", seats: 8, sold: 7, price: Math.round(base * 1.94), aiPrice: Math.round(base * 2.12), status: "Open" },
        { name: "일반석 정상", code: "Y", seats: 30, sold: 28, price: Math.round(base * 1.24), aiPrice: Math.round(base * 1.39), status: "Open" },
        { name: "일반석 할인", code: "M", seats: 85, sold: 75, price: Math.round(base * 0.95), aiPrice: Math.round(base * 1.05), status: "Open" },
        { name: "일반석 특가", code: "V", seats: 50, sold: 42, price: Math.round(base * 0.73), aiPrice: Math.round(base * 0.73), status: "Closed" },
      ],
      reason: "출발 7일 전, 예약 페이스가 과거 평균 대비 15% 빠름. 프레스티지 거의 마감. 일반석 정상 운임 즉시 인상 권고.",
    },
    {
      id: "KE1205", time: "10:15", timeSlot: "오전", status: "안정적",
      lf: 62, pace: "+2%",
      currentPrice: base,
      aiRecommended: base,
      baseCost: Math.round(10800000 * mul),
      classes: [
        { name: "프레스티지", code: "C", seats: 8, sold: 3, price: Math.round(base * 1.82), aiPrice: Math.round(base * 1.82), status: "Open" },
        { name: "일반석 정상", code: "Y", seats: 30, sold: 18, price: Math.round(base * 1.12), aiPrice: Math.round(base * 1.12), status: "Open" },
        { name: "일반석 할인", code: "M", seats: 85, sold: 55, price: Math.round(base * 0.88), aiPrice: Math.round(base * 0.88), status: "Open" },
        { name: "일반석 특가", code: "V", seats: 50, sold: 31, price: Math.round(base * 0.68), aiPrice: Math.round(base * 0.68), status: "Open" },
      ],
      reason: "전형적인 비선호 시간대 패턴. 전 클래스 인벤토리 개방 유지 권고. 현재 운임 수준 적정.",
    },
    {
      id: "KE1211", time: "13:45", timeSlot: "오후", status: "수요 저조",
      lf: 45, pace: "-5%",
      currentPrice: Math.round(base * 0.93),
      aiRecommended: Math.round(base * 0.85),
      baseCost: Math.round(10200000 * mul),
      classes: [
        { name: "프레스티지", code: "C", seats: 8, sold: 1, price: Math.round(base * 1.71), aiPrice: Math.round(base * 1.65), status: "Open" },
        { name: "일반석 정상", code: "Y", seats: 30, sold: 10, price: Math.round(base * 1.05), aiPrice: Math.round(base * 0.97), status: "Open" },
        { name: "일반석 할인", code: "M", seats: 85, sold: 35, price: Math.round(base * 0.82), aiPrice: Math.round(base * 0.76), status: "Open" },
        { name: "일반석 특가", code: "V", seats: 50, sold: 32, price: Math.round(base * 0.58), aiPrice: Math.round(base * 0.55), status: "Open" },
      ],
      reason: "예약 유입 속도 저조. 일반석 특가 공급 확대 및 일반석 할인 운임 인하 필요.",
    },
    {
      id: "KE1223", time: "18:20", timeSlot: "저녁", status: "매진임박",
      lf: 94, pace: "+20%",
      currentPrice: Math.round(base * 1.32),
      aiRecommended: Math.round(base * 1.59),
      baseCost: Math.round(12000000 * mul),
      classes: [
        { name: "프레스티지", code: "C", seats: 8, sold: 8, price: Math.round(base * 2.06), aiPrice: Math.round(base * 2.35), status: "Sold Out" },
        { name: "일반석 정상", code: "Y", seats: 30, sold: 30, price: Math.round(base * 1.32), aiPrice: Math.round(base * 1.59), status: "Sold Out" },
        { name: "일반석 할인", code: "M", seats: 85, sold: 82, price: Math.round(base * 1.02), aiPrice: Math.round(base * 1.18), status: "Open" },
        { name: "일반석 특가", code: "V", seats: 50, sold: 43, price: Math.round(base * 0.81), aiPrice: Math.round(base * 0.81), status: "Closed" },
      ],
      reason: "프레스티지·일반석 정상 전석 매진. 일반석 할인 잔여 3석. 일반석 특가 즉시 마감 후 할인 운임 즉시 인상 필요.",
    },
  ];
}
