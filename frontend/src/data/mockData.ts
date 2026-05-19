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
  aircraft: string;    // 기종 (예: B737-900ER)
  totalSeats: number;  // 총 좌석 수
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
  "GMP-CJU", "GMP-PUS", "GMP-TAE", "GMP-KWJ",
  "ICN-CJU", "ICN-PUS", "GMP-KPO", "GMP-RSU",
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

const AIRCRAFT_CONFIG: Record<string, { c: number; y: number; m: number; v: number; total: number }> = {
  "B737-900ER": { c: 8,  y: 35, m: 95, v: 62, total: 200 },
  "B737-800":   { c: 8,  y: 28, m: 76, v: 46, total: 158 },
  "A220-300":   { c: 4,  y: 22, m: 62, v: 42, total: 130 },
};

const ROUTE_SCHEDULES: Record<string, RouteSchedule[]> = {
  "GMP-CJU": [
    { flightNo: "KE1201", time: "06:30", timeSlot: "아침",  aircraft: "B737-900ER" },
    { flightNo: "KE1203", time: "07:30", timeSlot: "아침",  aircraft: "B737-800"   },
    { flightNo: "KE1205", time: "08:30", timeSlot: "아침",  aircraft: "B737-900ER" },
    { flightNo: "KE1207", time: "09:30", timeSlot: "오전",  aircraft: "B737-800"   },
    { flightNo: "KE1209", time: "10:35", timeSlot: "오전",  aircraft: "A220-300"   },
    { flightNo: "KE1211", time: "11:40", timeSlot: "오전",  aircraft: "B737-800"   },
    { flightNo: "KE1213", time: "12:50", timeSlot: "오후",  aircraft: "B737-900ER" },
    { flightNo: "KE1215", time: "14:00", timeSlot: "오후",  aircraft: "B737-800"   },
    { flightNo: "KE1217", time: "15:10", timeSlot: "오후",  aircraft: "A220-300"   },
    { flightNo: "KE1219", time: "16:20", timeSlot: "오후",  aircraft: "B737-800"   },
    { flightNo: "KE1221", time: "17:30", timeSlot: "저녁",  aircraft: "B737-900ER" },
    { flightNo: "KE1223", time: "18:40", timeSlot: "저녁",  aircraft: "B737-800"   },
    { flightNo: "KE1225", time: "19:50", timeSlot: "저녁",  aircraft: "B737-900ER" },
    { flightNo: "KE1227", time: "21:00", timeSlot: "저녁",  aircraft: "B737-800"   },
  ],
  "GMP-PUS": [
    { flightNo: "KE1401", time: "07:00", timeSlot: "아침",  aircraft: "B737-800" },
    { flightNo: "KE1403", time: "09:10", timeSlot: "오전",  aircraft: "B737-800" },
    { flightNo: "KE1405", time: "12:20", timeSlot: "오후",  aircraft: "B737-800" },
    { flightNo: "KE1407", time: "15:30", timeSlot: "오후",  aircraft: "B737-800" },
    { flightNo: "KE1409", time: "18:40", timeSlot: "저녁",  aircraft: "B737-800" },
    { flightNo: "KE1411", time: "21:00", timeSlot: "저녁",  aircraft: "B737-800" },
  ],
  "GMP-CJJ": [
    { flightNo: "KE1501", time: "07:40", timeSlot: "아침",  aircraft: "B737-800" },
    { flightNo: "KE1503", time: "11:00", timeSlot: "오전",  aircraft: "B737-800" },
    { flightNo: "KE1505", time: "14:30", timeSlot: "오후",  aircraft: "B737-800" },
    { flightNo: "KE1507", time: "18:20", timeSlot: "저녁",  aircraft: "B737-800" },
  ],
  "GMP-TAE": [
    { flightNo: "KE1601", time: "07:50", timeSlot: "아침",  aircraft: "B737-800" },
    { flightNo: "KE1603", time: "11:30", timeSlot: "오전",  aircraft: "B737-800" },
    { flightNo: "KE1605", time: "15:00", timeSlot: "오후",  aircraft: "B737-800" },
    { flightNo: "KE1607", time: "19:10", timeSlot: "저녁",  aircraft: "B737-800" },
  ],
  "GMP-KWJ": [
    { flightNo: "KE1701", time: "08:10", timeSlot: "아침",  aircraft: "B737-800" },
    { flightNo: "KE1703", time: "12:40", timeSlot: "오후",  aircraft: "B737-800" },
    { flightNo: "KE1705", time: "17:50", timeSlot: "저녁",  aircraft: "B737-800" },
  ],
  "ICN-CJU": [
    { flightNo: "KE1801", time: "08:00", timeSlot: "아침",  aircraft: "B737-900ER" },
    { flightNo: "KE1803", time: "10:30", timeSlot: "오전",  aircraft: "B737-900ER" },
    { flightNo: "KE1805", time: "13:00", timeSlot: "오후",  aircraft: "B737-900ER" },
    { flightNo: "KE1807", time: "16:00", timeSlot: "오후",  aircraft: "B737-900ER" },
    { flightNo: "KE1809", time: "19:30", timeSlot: "저녁",  aircraft: "B737-900ER" },
  ],
  "ICN-PUS": [
    { flightNo: "KE1901", time: "07:30", timeSlot: "아침",  aircraft: "B737-800" },
    { flightNo: "KE1903", time: "12:00", timeSlot: "오후",  aircraft: "B737-800" },
    { flightNo: "KE1905", time: "18:30", timeSlot: "저녁",  aircraft: "B737-800" },
  ],
  "GMP-KPO": [
    { flightNo: "KE2001", time: "08:20", timeSlot: "아침",  aircraft: "B737-800" },
    { flightNo: "KE2003", time: "13:10", timeSlot: "오후",  aircraft: "B737-800" },
    { flightNo: "KE2005", time: "18:00", timeSlot: "저녁",  aircraft: "B737-800" },
  ],
  "GMP-RSU": [
    { flightNo: "KE2101", time: "09:00", timeSlot: "오전",  aircraft: "B737-800" },
    { flightNo: "KE2103", time: "14:20", timeSlot: "오후",  aircraft: "B737-800" },
    { flightNo: "KE2105", time: "19:40", timeSlot: "저녁",  aircraft: "B737-800" },
  ],
};

const ROUTE_BASE_PRICE: Record<string, number> = {
  "GMP-CJU": 98000, "ICN-CJU": 105000, "GMP-PUS": 82000,
  "GMP-CJJ": 78000, "GMP-TAE": 75000,  "GMP-KWJ": 70000,
  "ICN-PUS": 80000, "GMP-KPO": 72000,  "GMP-RSU": 68000,
};

const ROUTE_BASE_COST: Record<string, number> = {
  "GMP-CJU": 12000000, "ICN-CJU": 13000000, "GMP-PUS": 10000000,
  "GMP-CJJ": 9500000,  "GMP-TAE": 9000000,  "GMP-KWJ": 8500000,
  "ICN-PUS": 9800000,  "GMP-KPO": 8800000,  "GMP-RSU": 8200000,
};

// 편 상태 및 LF/pace 패턴 (시간대 + 인덱스 기반 결정론적 생성)
function flightPattern(idx: number, timeSlot: string): { lf: number; pace: string; status: DashboardFlight["status"] } {
  const patterns = [
    { lf: 88, pace: "+12%", status: "수요 급증"  as const },
    { lf: 62, pace: "+2%",  status: "안정적"    as const },
    { lf: 45, pace: "-5%",  status: "수요 저조" as const },
    { lf: 94, pace: "+20%", status: "매진임박"  as const },
    { lf: 73, pace: "+5%",  status: "안정적"    as const },
    { lf: 55, pace: "-3%",  status: "수요 저조" as const },
    { lf: 81, pace: "+8%",  status: "수요 급증" as const },
  ];
  const base = patterns[idx % patterns.length];
  // 아침·저녁 시간대 LF 소폭 가중
  const lfBoost = (timeSlot === "아침" || timeSlot === "저녁") ? 5 : 0;
  return { ...base, lf: Math.min(99, base.lf + lfBoost) };
}

export function buildDashboardFlights(route: string): DashboardFlight[] {
  const schedules = ROUTE_SCHEDULES[route] ?? ROUTE_SCHEDULES["GMP-CJU"];
  const basePrice = ROUTE_BASE_PRICE[route] ?? 85000;
  const baseCostBase = ROUTE_BASE_COST[route] ?? 11000000;

  return schedules.map((sched, idx) => {
    const cfg = AIRCRAFT_CONFIG[sched.aircraft];
    const { lf, pace, status } = flightPattern(idx, sched.timeSlot);
    const timeMul = (sched.timeSlot === "아침" || sched.timeSlot === "저녁") ? 1.12 : 0.97;
    const base = Math.round(basePrice * timeMul);

    // 기종별 baseCost 보정 (대형기일수록 고정비 증가)
    const sizeMul = sched.aircraft === "B737-900ER" ? 1.10 : sched.aircraft === "A220-300" ? 0.88 : 1.0;
    const baseCost = Math.round(baseCostBase * sizeMul);

    const soldRatio = lf / 100;
    const hasAiRec = idx % 3 !== 1; // 3편 중 2편에 AI 추천 존재

    return {
      id: sched.flightNo,
      time: sched.time,
      timeSlot: sched.timeSlot,
      status,
      lf,
      pace,
      aircraft: sched.aircraft,
      totalSeats: cfg.total,
      currentPrice: base,
      aiRecommended: hasAiRec ? Math.round(base * (lf >= 80 ? 1.12 : 0.92)) : base,
      baseCost,
      classes: [
        {
          name: "프레스티지", code: "C", seats: cfg.c,
          sold: Math.min(cfg.c, Math.round(cfg.c * Math.min(soldRatio * 1.1, 1))),
          price: Math.round(base * 1.95),
          aiPrice: hasAiRec ? Math.round(base * (lf >= 80 ? 2.18 : 1.80)) : Math.round(base * 1.95),
          status: Math.round(cfg.c * soldRatio * 1.1) >= cfg.c ? "Sold Out" : "Open",
        },
        {
          name: "일반석 정상", code: "Y", seats: cfg.y,
          sold: Math.min(cfg.y, Math.round(cfg.y * soldRatio * 1.05)),
          price: Math.round(base * 1.22),
          aiPrice: hasAiRec ? Math.round(base * (lf >= 80 ? 1.38 : 1.10)) : Math.round(base * 1.22),
          status: Math.round(cfg.y * soldRatio * 1.05) >= cfg.y ? "Sold Out" : "Open",
        },
        {
          name: "일반석 할인", code: "M", seats: cfg.m,
          sold: Math.min(cfg.m, Math.round(cfg.m * soldRatio)),
          price: Math.round(base * 0.94),
          aiPrice: hasAiRec ? Math.round(base * (lf >= 80 ? 1.05 : 0.85)) : Math.round(base * 0.94),
          status: "Open",
        },
        {
          name: "일반석 특가", code: "V", seats: cfg.v,
          sold: Math.min(cfg.v, Math.round(cfg.v * soldRatio * 0.9)),
          price: Math.round(base * 0.72),
          aiPrice: Math.round(base * 0.72),
          status: lf >= 85 ? "Closed" : "Open",
        },
      ],
      reason: lf >= 85
        ? `예약 페이스 과거 대비 빠름(LF ${lf}%). ${sched.aircraft} 운항. 상위 클래스 운임 즉시 인상 권고.`
        : lf <= 55
        ? `예약 유입 저조(LF ${lf}%). ${sched.aircraft} 운항. 하위 클래스 공급 확대 및 할인 운임 인하 필요.`
        : `수요 안정적(LF ${lf}%). ${sched.aircraft} 운항. 현행 운임 수준 유지 권고.`,
    };
  });
}
