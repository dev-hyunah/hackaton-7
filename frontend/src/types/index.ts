export type TierCode = 'prestige' | 'economy_full' | 'economy_discount' | 'economy_special';
export type ClassStatus = 'open' | 'closed' | 'sold_out';
export type FlightStatusCode = 'demand_surge' | 'stable' | 'low_demand' | 'critical';
export type TimeSlot = 'morning' | 'forenoon' | 'afternoon' | 'evening';
export type RecommendationStatus = 'pending' | 'approved' | 'rejected';
export type ChangeType = 'MANUAL' | 'AI';
export type ReportStatus = 'idle' | 'generating' | 'ready' | 'error';

export interface BookingClassDTO {
  classCode: string;
  tier: TierCode;
  status: ClassStatus;
  currentPrice: number;
  aiRecommendedPrice: number | null;
  soldSeats: number;
  totalSeats: number;
}

export interface FlightFareDTO {
  flightId: string;
  flightNumber: string;
  route: string;
  departureTime: string;
  timeSlot: TimeSlot;
  loadFactor: number;
  pace: number;
  currentPrice: number;
  aiRecommendedPrice: number | null;
  status: FlightStatusCode;
  classes: BookingClassDTO[];
  baseCost: number;
  analysisReason: string;
}

export interface AiRecommendationDTO {
  recommendationId: string;
  flightId: string;
  flightNumber: string;
  route: string;
  departureTime: string;
  classCode: string;
  tier: TierCode;
  currentPrice: number;
  recommendedPrice: number;
  rationale: string;
  changePercent: number;
  confidence: number;
  predictedLoadFactor: number;
  requiresManualApproval: boolean;
  status: RecommendationStatus;
  createdAt: string;
}

export interface PriceHistoryDTO {
  id: string;
  fareTierId: string;
  classCode: string;
  changeType: ChangeType;
  priceBefore: number;
  priceAfter: number;
  changedBy: string;
  changedAt: string;
}

export interface CompetitorPriceDTO {
  route: string;
  airline: string;
  bookingClass: string;
  fare: number;
  date: string;
}

export interface PriceComparisonDTO {
  route: string;
  date: string;
  myFares: Record<string, number>;
  competitors: CompetitorPriceDTO[];
}

export interface SimulationParamsDTO {
  route: string;
  date: string;
  fuelChangePercent: number;
  exchangeRatePercent: number;
  priceChangePercent: number;
}

export interface SimulationChartPoint {
  month: string;
  baseline: number;
  simulation: number;
  lf: number;
}

export interface SimulationResultDTO {
  expectedDemandChange: number;
  expectedRevenueChange: number;
  optimalPriceRange: { min: number; max: number };
  chartData: SimulationChartPoint[];
}

export interface ProfitAnalysisDTO {
  flightId: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  soldSeats: number;
  loadFactor: number;
}

export interface StrategyAnalysisDTO {
  strategyId: string;
  description: string;
  flightId: string;
  recommendedPrice: number;
  createdAt: string;
}

export interface RoutePerformanceDTO {
  route: string;
  revenue: number;
  target: number;
  loadFactor: number;
}

export interface YieldTrendDTO {
  month: string;
  yield: number;
  target: number;
}

export interface AiStatsDTO {
  approvedCount: number;
  rejectedCount: number;
}

export interface RevenueDataPointDTO {
  date: string;
  revenue: number;
  bookings: number;
}

export interface ReportDTO {
  reportId: string;
  route: string | null;
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalTarget: number;
  achieveRate: number;
  routePerformance: RoutePerformanceDTO[];
  yieldTrend: YieldTrendDTO[];
  aiStats: AiStatsDTO;
  revenueHistory: RevenueDataPointDTO[];
  createdAt: string;
}

export interface DemandForecastDTO {
  route: string;
  date: string;
  forecastedDemand: number;
  confidenceInterval: { lower: number; upper: number };
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface ApprovalResultDTO {
  recommendationId: string;
  status: 'approved';
  updatedPrice: number;
}

export interface RejectionResultDTO {
  recommendationId: string;
  status: 'rejected';
}

export interface FareUpdateResultDTO {
  flightId: string;
  classCode: string;
  oldPrice: number;
  newPrice: number;
  updatedAt: string;
}
