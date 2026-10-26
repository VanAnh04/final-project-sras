export interface CancelReasonStat {
  reason: string;
  count: number;
  percentage: number;
}

export interface FunnelStage {
  created: number;
  accepted: number;
  enRoute: number;
  arrived: number;
  completed: number;
}

export interface CancellationBreakdown {
  byCustomer: number;
  byGarage: number;
  bySystem: number;
  topReasons: CancelReasonStat[];
}

export interface DailyOperationsTrend {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
}

export interface RescueOperationsMetrics {
  totalRequests: number;
  completedRequests: number;
  activeRequests: number;
  cancelledRequests: number;
  successRate: number;
  cancellationRate: number;
  avgArrivalMinutes: number;
  avgHandlingMinutes: number;
  avgDispatchDistanceKm: number;
  funnel: FunnelStage;
  cancellationBreakdown: CancellationBreakdown;
  dailyTrends: DailyOperationsTrend[];
}

export interface FeeBreakdown {
  rescueFee: number;
  towingFee: number;
  serviceFee: number;
  rescueFeePct: number;
  towingFeePct: number;
  serviceFeePct: number;
}

export interface PaymentMethodBreakdown {
  bankTransferAmount: number;
  bankTransferCount: number;
  cashAmount: number;
  cashCount: number;
  cashlessRate: number;
}

export interface DailyFinancialTrend {
  date: string;
  gmv: number;
  commission: number;
  orderCount: number;
}

export interface FinancialAnalyticsMetrics {
  totalGmv: number;
  totalCommission: number;
  garagePayout: number;
  avgOrderValue: number;
  effectiveCommissionRate: number;
  completedOrderCount: number;
  feeBreakdown: FeeBreakdown;
  paymentBreakdown: PaymentMethodBreakdown;
  dailyTrends: DailyFinancialTrend[];
}

export interface VehicleBreakdown {
  carCount: number;
  motorbikeCount: number;
  carPercentage: number;
  motorbikePercentage: number;
}

export interface ResolutionBreakdown {
  onsiteCount: number;
  towCount: number;
  onsitePercentage: number;
  towPercentage: number;
}

export interface HourlyIncidentStat {
  hour: number;
  label: string;
  count: number;
}

export interface IssueTypeStat {
  issueCode: string;
  issueName: string;
  count: number;
  percentage: number;
}

export interface HotspotStat {
  address: string;
  count: number;
}

export interface IncidentAnalyticsMetrics {
  totalIncidents: number;
  vehicleBreakdown: VehicleBreakdown;
  resolutionBreakdown: ResolutionBreakdown;
  peakHourLabel: string;
  peakHourCount: number;
  nightIncidentRate: number;
  hourlyDistribution: HourlyIncidentStat[];
  topIssueTypes: IssueTypeStat[];
  topHotspots: HotspotStat[];
}

export type TimeRangeFilter = 'TODAY' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'CUSTOM';


