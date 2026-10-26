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

export type TimeRangeFilter = 'TODAY' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'CUSTOM';
