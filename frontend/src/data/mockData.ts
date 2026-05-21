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
  {
    id: "F001",
    route: "GMP-CJU",
    flightNo: "KE1201",
    date: "2026-05-20",
    departureTime: "07:00",
    totalSeats: 180,
    bookedSeats: 142,
  },
  {
    id: "F002",
    route: "GMP-CJU",
    flightNo: "KE1203",
    date: "2026-05-20",
    departureTime: "10:30",
    totalSeats: 180,
    bookedSeats: 98,
  },
  {
    id: "F003",
    route: "GMP-CJU",
    flightNo: "KE1205",
    date: "2026-05-20",
    departureTime: "14:00",
    totalSeats: 180,
    bookedSeats: 160,
  },
  {
    id: "F004",
    route: "GMP-PUS",
    flightNo: "KE1401",
    date: "2026-05-20",
    departureTime: "08:00",
    totalSeats: 150,
    bookedSeats: 87,
  },
  {
    id: "F005",
    route: "ICN-CJU",
    flightNo: "OZ8901",
    date: "2026-05-20",
    departureTime: "09:00",
    totalSeats: 200,
    bookedSeats: 173,
  },
  {
    id: "F006",
    route: "GMP-CJU",
    flightNo: "KE1207",
    date: "2026-05-21",
    departureTime: "07:00",
    totalSeats: 180,
    bookedSeats: 65,
  },
  {
    id: "F007",
    route: "GMP-PUS",
    flightNo: "KE1403",
    date: "2026-05-21",
    departureTime: "11:00",
    totalSeats: 150,
    bookedSeats: 110,
  },
];

export const fareClasses: FareClass[] = [
  {
    flightId: "F001",
    bookingClass: "Y",
    fare: 158000,
    availableSeats: 10,
    bookedSeats: 10,
    status: "closed",
  },
  {
    flightId: "F001",
    bookingClass: "B",
    fare: 128000,
    availableSeats: 14,
    bookedSeats: 14,
    status: "closed",
  },
  {
    flightId: "F001",
    bookingClass: "M",
    fare: 108000,
    availableSeats: 20,
    bookedSeats: 20,
    status: "closed",
  },
  {
    flightId: "F001",
    bookingClass: "K",
    fare: 88000,
    availableSeats: 28,
    bookedSeats: 26,
    status: "open",
  },
  {
    flightId: "F001",
    bookingClass: "H",
    fare: 72000,
    availableSeats: 48,
    bookedSeats: 46,
    status: "open",
  },
  {
    flightId: "F001",
    bookingClass: "Q",
    fare: 58000,
    availableSeats: 60,
    bookedSeats: 26,
    status: "open",
  },
  {
    flightId: "F002",
    bookingClass: "Y",
    fare: 158000,
    availableSeats: 10,
    bookedSeats: 4,
    status: "open",
  },
  {
    flightId: "F002",
    bookingClass: "B",
    fare: 128000,
    availableSeats: 14,
    bookedSeats: 8,
    status: "open",
  },
  {
    flightId: "F002",
    bookingClass: "M",
    fare: 108000,
    availableSeats: 20,
    bookedSeats: 12,
    status: "open",
  },
  {
    flightId: "F002",
    bookingClass: "K",
    fare: 88000,
    availableSeats: 28,
    bookedSeats: 18,
    status: "open",
  },
  {
    flightId: "F002",
    bookingClass: "H",
    fare: 72000,
    availableSeats: 48,
    bookedSeats: 36,
    status: "open",
  },
  {
    flightId: "F002",
    bookingClass: "Q",
    fare: 58000,
    availableSeats: 60,
    bookedSeats: 20,
    status: "open",
  },
  {
    flightId: "F003",
    bookingClass: "Y",
    fare: 158000,
    availableSeats: 10,
    bookedSeats: 10,
    status: "closed",
  },
  {
    flightId: "F003",
    bookingClass: "B",
    fare: 128000,
    availableSeats: 14,
    bookedSeats: 14,
    status: "closed",
  },
  {
    flightId: "F003",
    bookingClass: "M",
    fare: 108000,
    availableSeats: 20,
    bookedSeats: 20,
    status: "closed",
  },
  {
    flightId: "F003",
    bookingClass: "K",
    fare: 88000,
    availableSeats: 28,
    bookedSeats: 28,
    status: "closed",
  },
  {
    flightId: "F003",
    bookingClass: "H",
    fare: 72000,
    availableSeats: 48,
    bookedSeats: 48,
    status: "waitlist",
  },
  {
    flightId: "F003",
    bookingClass: "Q",
    fare: 58000,
    availableSeats: 60,
    bookedSeats: 40,
    status: "open",
  },
];

export const aiRecommendations: AiRecommendation[] = [
  {
    id: "REC001",
    flightId: "F002",
    bookingClass: "Q",
    currentFare: 58000,
    recommendedFare: 48000,
    confidence: 87,
    reason:
      "출발 5일 전 저조한 탑승률(54%). 수요 탄력성 분석 결과 가격 인하 시 Load Factor 75% 달성 예상.",
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
    reason:
      "상위 클래스 전체 매진. 잔여 Q클래스 수요 집중 예상. 경쟁사 대비 14% 낮은 현행 운임.",
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
    reason:
      "내일 출발 편 탑승률 36%로 매우 저조. 경쟁사 동일 시간대 운임 53,000원 대비 높은 수준.",
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
    reason:
      "ICN-CJU 노선 주말 전 높은 수요. 현재 탑승률 86.5%. 수요 예측 모델 기준 인상 여력 있음.",
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
    reason:
      "GMP-PUS 노선 탑승률 58%. 비성수기 패턴 감지. 가격 민감 고객층 유입 필요.",
    predictedLoadFactor: 72,
    status: "rejected",
    createdAt: "2026-05-15T07:50:00Z",
  },
];

export const competitorPrices: CompetitorPrice[] = [
  // GMP-CJU — KE 기준: F=313000, C=190000, Y=121000, V=71000
  {
    route: "GMP-CJU",
    airline: "아시아나항공",
    bookingClass: "F",
    fare: 298000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "아시아나항공",
    bookingClass: "C",
    fare: 178000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "아시아나항공",
    bookingClass: "Y",
    fare: 115000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "아시아나항공",
    bookingClass: "V",
    fare: 67000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "제주항공",
    bookingClass: "Y",
    fare: 98000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "제주항공",
    bookingClass: "V",
    fare: 52000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "진에어",
    bookingClass: "Y",
    fare: 95000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "진에어",
    bookingClass: "V",
    fare: 49000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "에어부산",
    bookingClass: "Y",
    fare: 92000,
    date: "2026-05-20",
  },
  {
    route: "GMP-CJU",
    airline: "에어부산",
    bookingClass: "V",
    fare: 47000,
    date: "2026-05-20",
  },
  // GMP-PUS — KE 기준: F=245000, C=149000, Y=95000, V=56000
  {
    route: "GMP-PUS",
    airline: "아시아나항공",
    bookingClass: "F",
    fare: 232000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "아시아나항공",
    bookingClass: "C",
    fare: 140000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "아시아나항공",
    bookingClass: "Y",
    fare: 90000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "아시아나항공",
    bookingClass: "V",
    fare: 52000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "제주항공",
    bookingClass: "Y",
    fare: 76000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "제주항공",
    bookingClass: "V",
    fare: 40000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "진에어",
    bookingClass: "Y",
    fare: 74000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "진에어",
    bookingClass: "V",
    fare: 38000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "에어부산",
    bookingClass: "Y",
    fare: 72000,
    date: "2026-05-20",
  },
  {
    route: "GMP-PUS",
    airline: "에어부산",
    bookingClass: "V",
    fare: 37000,
    date: "2026-05-20",
  },
  // ICN-CJU — KE 기준: F=299000, C=181000, Y=116000, V=68000
  {
    route: "ICN-CJU",
    airline: "아시아나항공",
    bookingClass: "F",
    fare: 285000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "아시아나항공",
    bookingClass: "C",
    fare: 170000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "아시아나항공",
    bookingClass: "Y",
    fare: 110000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "아시아나항공",
    bookingClass: "V",
    fare: 64000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "제주항공",
    bookingClass: "Y",
    fare: 94000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "제주항공",
    bookingClass: "V",
    fare: 50000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "진에어",
    bookingClass: "Y",
    fare: 91000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "진에어",
    bookingClass: "V",
    fare: 47000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "에어부산",
    bookingClass: "Y",
    fare: 88000,
    date: "2026-05-20",
  },
  {
    route: "ICN-CJU",
    airline: "에어부산",
    bookingClass: "V",
    fare: 45000,
    date: "2026-05-20",
  },
  // ICN-PUS — KE 기준: F=239000, C=145000, Y=93000, V=55000
  {
    route: "ICN-PUS",
    airline: "아시아나항공",
    bookingClass: "F",
    fare: 228000,
    date: "2026-05-20",
  },
  {
    route: "ICN-PUS",
    airline: "아시아나항공",
    bookingClass: "C",
    fare: 136000,
    date: "2026-05-20",
  },
  {
    route: "ICN-PUS",
    airline: "아시아나항공",
    bookingClass: "Y",
    fare: 88000,
    date: "2026-05-20",
  },
  {
    route: "ICN-PUS",
    airline: "아시아나항공",
    bookingClass: "V",
    fare: 51000,
    date: "2026-05-20",
  },
  {
    route: "ICN-PUS",
    airline: "제주항공",
    bookingClass: "Y",
    fare: 75000,
    date: "2026-05-20",
  },
  {
    route: "ICN-PUS",
    airline: "제주항공",
    bookingClass: "V",
    fare: 39000,
    date: "2026-05-20",
  },
  {
    route: "ICN-PUS",
    airline: "진에어",
    bookingClass: "Y",
    fare: 73000,
    date: "2026-05-20",
  },
  {
    route: "ICN-PUS",
    airline: "진에어",
    bookingClass: "V",
    fare: 38000,
    date: "2026-05-20",
  },
  // GMP-TAE — KE 기준: F=218000, C=132000, Y=84000, V=50000
  {
    route: "GMP-TAE",
    airline: "아시아나항공",
    bookingClass: "F",
    fare: 207000,
    date: "2026-05-20",
  },
  {
    route: "GMP-TAE",
    airline: "아시아나항공",
    bookingClass: "C",
    fare: 124000,
    date: "2026-05-20",
  },
  {
    route: "GMP-TAE",
    airline: "아시아나항공",
    bookingClass: "Y",
    fare: 80000,
    date: "2026-05-20",
  },
  {
    route: "GMP-TAE",
    airline: "아시아나항공",
    bookingClass: "V",
    fare: 46000,
    date: "2026-05-20",
  },
  {
    route: "GMP-TAE",
    airline: "진에어",
    bookingClass: "Y",
    fare: 68000,
    date: "2026-05-20",
  },
  {
    route: "GMP-TAE",
    airline: "진에어",
    bookingClass: "V",
    fare: 36000,
    date: "2026-05-20",
  },
  {
    route: "GMP-TAE",
    airline: "티웨이항공",
    bookingClass: "Y",
    fare: 65000,
    date: "2026-05-20",
  },
  {
    route: "GMP-TAE",
    airline: "티웨이항공",
    bookingClass: "V",
    fare: 34000,
    date: "2026-05-20",
  },
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
  seats: number; // 전체 좌석
  sold: number; // 판매 좌석
  price: number; // 현재 운임
  aiPrice: number; // AI 추천 운임
  status: DashboardClassStatus;
}

export interface DashboardFlight {
  id: string;
  flightNo: string; // 편명 (예: KE1201)
  route: string; // 노선 (예: GMP-CJU)
  time: string;
  timeSlot: "아침" | "오전" | "오후" | "저녁";
  status: FlightStatus;
  lf: number; // Load Factor (%)
  pace: string; // 예약 페이스 (전주 대비)
  currentPrice: number;
  aiRecommended: number;
  baseCost: number;
  classes: DashboardClass[];
  reason: string; // AI 분석 근거
  aircraft: string; // 기종 (예: B737-900ER)
  totalSeats: number; // 총 좌석 수
}

export interface WeekDay {
  date: string; // "2026-05-15"
  label: string; // "15일"
  dayOfWeek: string; // "목"
  isToday: boolean;
  isPeak: boolean; // 성수기 여부
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
  "GMP-CJU",
  "GMP-PUS",
  "GMP-TAE",
  "GMP-KWJ",
  "ICN-CJU",
  "ICN-PUS",
  "GMP-KPO",
  "GMP-RSU",
];

// 노선별 실제 대한항공 국내선 항공편 스케줄 (기종·좌석 수 포함)

// 기종별 좌석 구성:
//   B737-900ER : 프레스티지 8 / 일반석 정상 35 / 일반석 할인 95 / 일반석 특가 62 = 200석 (실제 B737-9 국내선 기준)
//   B737-800   : 프레스티지 8 / 일반석 정상 28 / 일반석 할인 76 / 일반석 특가 46 = 158석
//   A220-300   : 프레스티지 4 / 일반석 정상 22 / 일반석 할인 62 / 일반석 특가 42 = 130석

interface RouteSchedule {
  flightNo: string;
  time: string;
  timeSlot: "아침" | "오전" | "오후" | "저녁";
  aircraft: "B737-900ER" | "B737-800" | "A220-300";
}

const AIRCRAFT_CONFIG: Record<
  string,
  { c: number; y: number; m: number; v: number; total: number }
> = {
  // V(특가): 전체의 약 10% — 적게 열고 빠르게 소진
  "B737-900ER": { c: 8, y: 52, m: 120, v: 20, total: 200 },
  "B737-800":   { c: 8, y: 41, m: 94,  v: 15, total: 158 },
  "A220-300":   { c: 4, y: 31, m: 83,  v: 12, total: 130 },
};

const ROUTE_SCHEDULES: Record<string, RouteSchedule[]> = {
  "GMP-CJU": [
    {
      flightNo: "KE1201",
      time: "06:30",
      timeSlot: "아침",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1203",
      time: "07:30",
      timeSlot: "아침",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1205",
      time: "08:30",
      timeSlot: "아침",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1207",
      time: "09:30",
      timeSlot: "오전",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1209",
      time: "10:35",
      timeSlot: "오전",
      aircraft: "A220-300",
    },
    {
      flightNo: "KE1211",
      time: "11:40",
      timeSlot: "오전",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1213",
      time: "12:50",
      timeSlot: "오후",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1215",
      time: "14:00",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1217",
      time: "15:10",
      timeSlot: "오후",
      aircraft: "A220-300",
    },
    {
      flightNo: "KE1219",
      time: "16:20",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1221",
      time: "17:30",
      timeSlot: "저녁",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1223",
      time: "18:40",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1225",
      time: "19:50",
      timeSlot: "저녁",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1227",
      time: "21:00",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
  ],
  "GMP-PUS": [
    {
      flightNo: "KE1401",
      time: "07:00",
      timeSlot: "아침",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1403",
      time: "09:10",
      timeSlot: "오전",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1405",
      time: "12:20",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1407",
      time: "15:30",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1409",
      time: "18:40",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1411",
      time: "21:00",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
  ],
  "GMP-CJJ": [
    {
      flightNo: "KE1501",
      time: "07:40",
      timeSlot: "아침",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1503",
      time: "11:00",
      timeSlot: "오전",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1505",
      time: "14:30",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1507",
      time: "18:20",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
  ],
  "GMP-TAE": [
    {
      flightNo: "KE1601",
      time: "07:50",
      timeSlot: "아침",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1603",
      time: "11:30",
      timeSlot: "오전",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1605",
      time: "15:00",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1607",
      time: "19:10",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
  ],
  "GMP-KWJ": [
    {
      flightNo: "KE1701",
      time: "08:10",
      timeSlot: "아침",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1703",
      time: "12:40",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1705",
      time: "17:50",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
  ],
  "ICN-CJU": [
    {
      flightNo: "KE1801",
      time: "08:00",
      timeSlot: "아침",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1803",
      time: "10:30",
      timeSlot: "오전",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1805",
      time: "13:00",
      timeSlot: "오후",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1807",
      time: "16:00",
      timeSlot: "오후",
      aircraft: "B737-900ER",
    },
    {
      flightNo: "KE1809",
      time: "19:30",
      timeSlot: "저녁",
      aircraft: "B737-900ER",
    },
  ],
  "ICN-PUS": [
    {
      flightNo: "KE1901",
      time: "07:30",
      timeSlot: "아침",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1903",
      time: "12:00",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE1905",
      time: "18:30",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
  ],
  "GMP-KPO": [
    {
      flightNo: "KE2001",
      time: "08:20",
      timeSlot: "아침",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE2003",
      time: "13:10",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE2005",
      time: "18:00",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
  ],
  "GMP-RSU": [
    {
      flightNo: "KE2101",
      time: "09:00",
      timeSlot: "오전",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE2103",
      time: "14:20",
      timeSlot: "오후",
      aircraft: "B737-800",
    },
    {
      flightNo: "KE2105",
      time: "19:40",
      timeSlot: "저녁",
      aircraft: "B737-800",
    },
  ],
};

// flightNo → aircraft 역조회 맵 (DB 응답에서 aircraft 필드 복원용)
export const FLIGHT_AIRCRAFT_MAP: Record<string, string> = (
  Object.values(ROUTE_SCHEDULES) as RouteSchedule[][]
)
  .flat()
  .reduce<Record<string, string>>((m, s) => {
    m[s.flightNo] = s.aircraft;
    return m;
  }, {});

// 노선별 일반석 정상(Y) 기준 운임 — 실제 대한항공 국내선 평균 비성수기 평일 기준
const ROUTE_BASE_PRICE: Record<string, number> = {
  "GMP-CJU": 115000,
  "ICN-CJU": 120000,
  "GMP-PUS": 95000,
  "GMP-CJJ": 88000,
  "GMP-TAE": 85000,
  "GMP-KWJ": 90000,
  "ICN-PUS": 92000,
  "GMP-KPO": 88000,
  "GMP-RSU": 84000,
};

const ROUTE_BASE_COST: Record<string, number> = {
  "GMP-CJU": 12000000,
  "ICN-CJU": 13000000,
  "GMP-PUS": 10000000,
  "GMP-CJJ": 9500000,
  "GMP-TAE": 9000000,
  "GMP-KWJ": 8500000,
  "ICN-PUS": 9800000,
  "GMP-KPO": 8800000,
  "GMP-RSU": 8200000,
};

// ── EMSRb (Expected Marginal Seat Revenue-b) ────────────────────────────────

// A&S 26.2.17 rational approximation for inverse normal CDF — |err| < 4.5e-4
function _normInv(p: number): number {
  if (p <= 0) return -8;
  if (p >= 1) return 8;
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const sign = p < 0.5 ? -1 : 1;
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));
  const num = a[0] + t * (a[1] + t * a[2]);
  const den = 1 + t * (b[0] + t * (b[1] + t * b[2]));
  return sign * (t - num / den);
}

export interface EMSRbInput {
  code: string;
  price: number; // 운임 (내림차순 전달 필수)
  meanDemand: number; // μ
  stdDemand: number; // σ
  minSeats: number; // 최소 보장 좌석 (= sold)
}

/**
 * EMSRb: 각 등급 protection level 계산 후 좌석 버킷 반환.
 * classes는 price 내림차순으로 전달해야 함.
 * 반환 배열 길이 = classes.length, 합계 = totalSeats 보장.
 */
export function emsrb(classes: EMSRbInput[], totalSeats: number): number[] {
  const n = classes.length;
  if (n === 0) return [];
  if (n === 1) return [Math.max(totalSeats, classes[0].minSeats)];

  // protection levels y[k]: 상위 k+1 등급을 합쳐서 보호할 좌석 수
  const y: number[] = new Array(n - 1);
  let aggMean = 0,
    aggVar = 0,
    aggRevenue = 0,
    aggCount = 0;

  for (let k = 0; k < n - 1; k++) {
    const c = classes[k];
    aggMean += c.meanDemand;
    aggVar += c.stdDemand * c.stdDemand;
    aggRevenue += c.price * c.meanDemand;
    aggCount += c.meanDemand;
    const aggStd = Math.sqrt(aggVar);
    const virtualFare = aggCount > 0 ? aggRevenue / aggCount : c.price;
    const nextFare = classes[k + 1].price;
    // P(revenue ≥ nextFare) → normInv(1 − nextFare/virtualFare)
    const ratio = Math.min(Math.max(nextFare / virtualFare, 0.001), 0.999);
    y[k] = Math.round(aggMean + aggStd * _normInv(1 - ratio));
    y[k] = Math.max(0, Math.min(y[k], totalSeats));
  }

  // 버킷 변환: bucket[0] = y[0], bucket[k] = y[k]-y[k-1], bucket[n-1] = total-y[n-2]
  const buckets: number[] = new Array(n);
  buckets[0] = y[0];
  for (let k = 1; k < n - 1; k++) buckets[k] = Math.max(0, y[k] - y[k - 1]);
  buckets[n - 1] = Math.max(0, totalSeats - y[n - 2]);

  // minSeats 강제: 부족 시 낮은 등급부터 차감
  for (let k = 0; k < n; k++) {
    if (buckets[k] < classes[k].minSeats) {
      const deficit = classes[k].minSeats - buckets[k];
      buckets[k] = classes[k].minSeats;
      // 낮은 등급(k+1 이후)에서 차감
      let rem = deficit;
      for (let j = n - 1; j > k && rem > 0; j--) {
        const take = Math.min(
          rem,
          Math.max(0, buckets[j] - classes[j].minSeats),
        );
        buckets[j] -= take;
        rem -= take;
      }
    }
  }

  // 합계 보정: 마지막 등급에서 보정 (minSeats 이상 유지)
  const total = buckets.reduce((s, v) => s + v, 0);
  const diff = totalSeats - total;
  buckets[n - 1] = Math.max(classes[n - 1].minSeats, buckets[n - 1] + diff);

  return buckets;
}

// ── 운임 배수 계산 ──────────────────────────────────────────────────────────

// 성수기 판단: 여름(7~8월), 겨울연말(12~1월), 설/추석 전후
function peakSeasonMultiplier(dateStr: string): number {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const mmdd = dateStr.slice(5); // "MM-DD"

  // 설날 전후 (보통 1월 말~2월 초, 고정 근사)
  const seollal = [
    "01-27",
    "01-28",
    "01-29",
    "01-30",
    "01-31",
    "02-01",
    "02-02",
    "02-03",
  ];
  // 추석 전후 (9월 말~10월 초, 고정 근사)
  const chuseok = [
    "09-28",
    "09-29",
    "09-30",
    "10-01",
    "10-02",
    "10-03",
    "10-04",
    "10-05",
  ];

  if (seollal.includes(mmdd) || chuseok.includes(mmdd)) return 1.4;
  if (month === 7 || month === 8) return 1.3; // 여름 성수기
  if (month === 12 || month === 1) return 1.18; // 겨울 연말연초
  if (month === 5 || month === 10) return 1.05; // 소성수기 (황금연휴·단풍)
  return 1.0; // 비수기 (봄·가을 평시)
}

// 요일 배수: 금·토·일 주말 수요 높음
function dowMultiplier(dateStr: string): number {
  const dow = new Date(dateStr).getDay(); // 0=일, 5=금, 6=토
  if (dow === 5 || dow === 6) return 1.22; // 금·토
  if (dow === 0) return 1.18; // 일
  if (dow === 1) return 0.95; // 월 (귀경 후 저조)
  return 1.0; // 화~목 평일
}

// 시간대 배수
function timeSlotMultiplier(slot: string): number {
  if (slot === "아침") return 1.15; // 첫편 수요 높음
  if (slot === "저녁") return 1.12; // 막편 수요 높음
  if (slot === "오전") return 1.0;
  return 0.95; // 오후 (낮 시간대 저조)
}

// 편 상태 및 LF/pace 패턴 (날짜 + 인덱스 기반 결정론적 생성)
function flightPattern(
  idx: number,
  timeSlot: string,
  dateStr: string,
): { lf: number; pace: string; status: DashboardFlight["status"] } {
  const peakMul = peakSeasonMultiplier(dateStr);
  const dowMul = dowMultiplier(dateStr);
  const combined = peakMul * dowMul;

  const basePatterns = [
    { lf: 72, pace: "+8%", status: "수요 급증" as const },
    { lf: 55, pace: "+2%", status: "안정적" as const },
    { lf: 40, pace: "-5%", status: "수요 저조" as const },
    { lf: 82, pace: "+18%", status: "매진임박" as const },
    { lf: 65, pace: "+5%", status: "안정적" as const },
    { lf: 48, pace: "-3%", status: "수요 저조" as const },
    { lf: 68, pace: "+6%", status: "수요 급증" as const },
  ];
  const base = basePatterns[idx % basePatterns.length];

  // 성수기·주말일수록 LF 높아짐
  const lfBoost = Math.round((combined - 1.0) * 30);
  // 아침·저녁 시간대 LF 가산
  const slotBoost = timeSlot === "아침" || timeSlot === "저녁" ? 8 : 0;
  const lf = Math.min(99, base.lf + lfBoost + slotBoost);

  // LF에 따라 status 재결정
  const status: DashboardFlight["status"] =
    lf >= 90
      ? "매진임박"
      : lf >= 78
        ? "수요 급증"
        : lf >= 60
          ? "안정적"
          : "수요 저조";

  return { lf, pace: base.pace, status };
}

// 운임을 1,000원 단위로 반올림
const r1k = (n: number) => Math.round(n / 1000) * 1000;

export function buildDashboardFlights(
  route: string,
  dateStr?: string,
): DashboardFlight[] {
  const schedules = ROUTE_SCHEDULES[route] ?? ROUTE_SCHEDULES["GMP-CJU"];
  // Y(일반석 정상) 기준 운임
  const yBase = ROUTE_BASE_PRICE[route] ?? 95000;
  const baseCostBase = ROUTE_BASE_COST[route] ?? 11000000;

  const date = dateStr ?? new Date().toISOString().slice(0, 10);
  const peakMul = peakSeasonMultiplier(date);
  const dowMul = dowMultiplier(date);

  return schedules.map((sched, idx) => {
    const cfg = AIRCRAFT_CONFIG[sched.aircraft];
    const { lf, pace, status } = flightPattern(idx, sched.timeSlot, date);
    const slotMul = timeSlotMultiplier(sched.timeSlot);

    // Y 운임: 기준 × 성수기 × 요일 × 시간대 (1,000원 단위)
    const priceY = r1k(yBase * peakMul * dowMul * slotMul);

    // 등급별 운임 — 실제 대한항공 국내선 비율 기준
    //   C(프레스티지) ≈ Y × 2.0~2.2  (성수기엔 위로)
    //   Y(일반석 정상) = 기준
    //   M(일반석 할인) ≈ Y × 0.68~0.72
    //   V(일반석 특가) ≈ Y × 0.35~0.45  (성수기 품절 많음)
    const cMul = peakMul >= 1.25 ? 2.2 : peakMul >= 1.1 ? 2.1 : 2.0;
    const mMul = 0.7;
    const vMul = peakMul >= 1.25 ? 0.45 : 0.38;

    const priceC = r1k(priceY * cMul);
    const priceM = r1k(priceY * mMul);
    const priceV = r1k(priceY * vMul);

    // AI 추천가: 수요 급증(LF≥80) → 인상, 수요 저조(LF≤55) → 인하, 안정적(56~79) → 추천 없음
    const hasAiRec = lf >= 80 || lf <= 55;
    const aiMul = lf >= 80 ? 1.12 : lf <= 55 ? 0.9 : 1.0;

    // 기종별 baseCost 보정
    const sizeMul =
      sched.aircraft === "B737-900ER"
        ? 1.1
        : sched.aircraft === "A220-300"
          ? 0.88
          : 1.0;
    const baseCost = Math.round(baseCostBase * sizeMul);

    const soldRatio = lf / 100;
    const cv = lf >= 80 ? 0.2 : lf >= 60 ? 0.25 : 0.4;

    // 이코노미 캐빈 전체 좌석 수 (Prestige 제외)
    const econTotal = cfg.total - cfg.c;
    // 이코노미 수요 추정 (총 수요의 92% = Prestige 제외)
    const ecoDemand = (lf / 100) * cfg.total * 0.92;

    // ── C(프레스티지) 판매량 ────────────────────────────────────────────────
    const soldC = Math.min(cfg.c, Math.round(cfg.c * Math.min(soldRatio * 1.15, 1)));

    // ── V(특가) 판매 fill rate: LF가 높을수록 거의 매진, 낮아도 70% 이상 ──
    // 특가는 공급이 적어 수요>공급 상태가 일반적
    // 인기 노선(lf>=75) → 거의 Sold Out, 비인기(lf<50) → 70~80% 소진
    const vFillRate = lf >= 85 ? 1.0
      : lf >= 75 ? 0.95
      : lf >= 60 ? 0.88
      : lf >= 50 ? 0.78
      : 0.68;
    const soldVraw = Math.round(cfg.v * vFillRate);

    // ── Y/M 판매량: soldRatio 중복 제거 (ecoDemand에 이미 lf 반영됨) ───────
    // V가 먼저 소진되므로 Y/M이 받는 실수요는 ecoDemand에서 soldVraw를 뺀 나머지
    const remainDemand = Math.max(0, ecoDemand - soldVraw);
    const soldYraw = Math.round(remainDemand * 0.29);   // Y: 잔여 수요의 29%
    const soldMraw = Math.round(remainDemand * 0.71);   // M: 잔여 수요의 71%

    // ── V Closed 조건: LF가 매우 높거나 성수기 ──────────────────────────────
    const vClosed = lf >= 90 || peakMul >= 1.25;

    // ── V는 EMSRb에서 분리: 정책 좌석(cfg.v) 고정 배정 ──────────────────────
    // 실제 항공사에서 특가 좌석은 사전 정책으로 소량 배정하고 EMSRb는 Y/M만 담당
    const seatsV = cfg.v;

    // ── EMSRb: Y·M만 (econTotal - cfg.v) 풀에서 분배 ────────────────────────
    const ymPool = econTotal - cfg.v;
    const econInputs: EMSRbInput[] = [
      {
        code: "Y",
        price: priceY,
        meanDemand: ecoDemand * 0.29,
        stdDemand: ecoDemand * 0.29 * cv,
        minSeats: Math.max(0, soldYraw),
      },
      {
        code: "M",
        price: priceM,
        meanDemand: ecoDemand * 0.71,
        stdDemand: ecoDemand * 0.71 * cv,
        minSeats: Math.max(0, soldMraw),
      },
    ];
    const econBuckets = emsrb(econInputs, ymPool);

    const seatsY = econBuckets[0];
    const seatsM = econBuckets[1];

    const soldY = Math.min(seatsY, soldYraw);
    const soldM = Math.min(seatsM, soldMraw);
    const soldV = Math.min(seatsV, soldVraw);

    const vStatus: DashboardClassStatus = vClosed
      ? "Closed"
      : soldV >= seatsV
        ? "Sold Out"
        : "Open";

    return {
      id: sched.flightNo,
      flightNo: sched.flightNo,
      route,
      time: sched.time,
      timeSlot: sched.timeSlot,
      status,
      lf,
      pace,
      aircraft: sched.aircraft,
      totalSeats: cfg.total,
      currentPrice: priceY,
      aiRecommended: hasAiRec ? r1k(priceY * aiMul) : priceY,
      baseCost,
      classes: [
        {
          name: "프레스티지",
          code: "C",
          seats: cfg.c,
          sold: soldC,
          price: priceC,
          aiPrice: hasAiRec ? r1k(priceC * aiMul) : priceC,
          status: soldC >= cfg.c ? ("Sold Out" as const) : ("Open" as const),
        },
        {
          name: "일반석 정상",
          code: "Y",
          seats: seatsY,
          sold: soldY,
          price: priceY,
          aiPrice: hasAiRec ? r1k(priceY * aiMul) : priceY,
          status: soldY >= seatsY ? ("Sold Out" as const) : ("Open" as const),
        },
        {
          name: "일반석 할인",
          code: "M",
          seats: seatsM,
          sold: soldM,
          price: priceM,
          aiPrice: hasAiRec ? r1k(priceM * aiMul) : priceM,
          status: soldM >= seatsM ? ("Sold Out" as const) : ("Open" as const),
        },
        {
          name: "일반석 특가",
          code: "V",
          seats: seatsV,
          sold: soldV,
          price: priceV,
          aiPrice: r1k(priceV * (lf >= 80 ? 1.05 : 0.95)),
          status: vStatus,
        },
      ],
      reason:
        lf >= 82
          ? `예약 페이스 과거 대비 빠름(LF ${lf}%). ${sched.aircraft} 운항. 상위 클래스 운임 즉시 인상 권고.`
          : lf <= 55
            ? `예약 유입 저조(LF ${lf}%). ${sched.aircraft} 운항. 하위 클래스 공급 확대 및 할인 운임 인하 필요.`
            : `수요 안정적(LF ${lf}%). ${sched.aircraft} 운항. 현행 운임 수준 유지 권고.`,
    };
  });
}

const statusFromLf = (lf: number): FlightStatus => {
  if (lf >= 90) return "매진임박";
  if (lf >= 80) return "수요 급증";
  if (lf >= 60) return "안정적";
  return "수요 저조";
};

/** 단일 항공편에 고객 활동 시뮬레이션 (구매/환불 랜덤 델타) 적용 */
export function simulateFlight(f: DashboardFlight): DashboardFlight {
  const updatedClasses = f.classes.map((cls) => {
    if (cls.status === "Closed") return cls;
    const available = cls.seats - cls.sold;
    const roll = Math.random();
    let delta = 0;
    if (roll < 0.45 && available > 0) {
      delta = Math.min(Math.ceil(Math.random() * 3), available);
    } else if (roll < 0.65 && cls.sold > 0) {
      delta = -Math.ceil(Math.random() * 2);
    }
    if (delta === 0) return cls;
    const newSold = Math.max(0, Math.min(cls.seats, cls.sold + delta));
    const newStatus: typeof cls.status =
      newSold >= cls.seats ? "Sold Out" : cls.status === "Sold Out" ? "Open" : cls.status;
    return { ...cls, sold: newSold, status: newStatus };
  });
  const totalSold = updatedClasses.reduce((s, c) => s + c.sold, 0);
  const totalSeats = updatedClasses.reduce((s, c) => s + c.seats, 0);
  const newLf = Math.round((totalSold / totalSeats) * 100);
  return { ...f, classes: updatedClasses, lf: newLf, status: statusFromLf(newLf) };
}
