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

export interface IncidentMapPoint {
  id: number;
  code: string;
  lat: number;
  lng: number;
  address: string;
  issueCode: string;
  issueName: string;
  vehicleType: string;
  quoteType: string;
  status: string;
  createdAtText: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  severityLabel: string;
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
  mapPoints: IncidentMapPoint[];
}

// ==================== TRỤC 4: ĐỐI TÁC GARA & KỸ THUẬT VIÊN ====================

export interface GaragePerformanceStat {
  garageId: number;
  garageName: string;
  phone: string;
  address: string;
  capability: 'CAR' | 'MOTORBIKE' | 'BOTH';
  totalAssigned: number;
  completedJobs: number;
  cancelledJobs: number;
  completionRate: number;
  totalGmv: number;
  platformCommission: number;
  avgArrivalTimeMinutes: number;
  avgRating: number;
  ratingCount: number;
  complaintCount: number;
  isOnline: boolean;
  rank: number;
  healthBadge: 'EXCELLENT' | 'GOOD' | 'WARNING';
  healthBadgeLabel: string;
}

export interface TechnicianPerformanceStat {
  staffId: number;
  staffName: string;
  phone: string;
  garageName: string;
  completedJobs: number;
  avgRating: number;
  ratingCount: number;
  rank: number;
}

export interface CapabilityDistribution {
  capability: string;
  label: string;
  count: number;
  percentage: number;
}

export interface GarageRiskAlert {
  garageId: number;
  garageName: string;
  reason: string;
  severity: 'HIGH' | 'MEDIUM';
  avgRating: number;
  cancelRate: number;
  openComplaints: number;
}

export interface PartnerAnalyticsMetrics {
  totalGarages: number;
  activeGarages: number;
  onlineGarages: number;
  totalTechnicians: number;
  activeTechnicians: number;
  networkFulfillmentRate: number;
  avgNetworkRating: number;
  topGarages: GaragePerformanceStat[];
  topTechnicians: TechnicianPerformanceStat[];
  capabilityBreakdown: CapabilityDistribution[];
  riskWatchlist: GarageRiskAlert[];
}

export type TimeRangeFilter = 'TODAY' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

export interface InsightItem {
  title: string;
  description: string;
  metric: string;
}

export interface AiActionRecommendation {
  id: string;
  title: string;
  priority: 'URGENT' | 'OPTIMIZATION' | 'STRATEGIC';
  category: 'DISPATCH' | 'SLA_SPEED' | 'CANCELLATION' | 'COVERAGE';
  problemStatement: string;
  proposedAction: string;
  expectedImpact: string;
}

export interface AiAnalyticsInsight {
  pillar: string;
  timeRange: string;
  generatedAt: string;
  executiveSummary: string;
  overallHealthStatus: 'EXCELLENT' | 'STABLE' | 'WARNING' | 'CRITICAL';
  healthScore: number;
  fromCache?: boolean;
  highlights: InsightItem[];
  bottlenecks: InsightItem[];
  recommendations: AiActionRecommendation[];
}




