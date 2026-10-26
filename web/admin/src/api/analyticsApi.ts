import axiosClient from './axiosClient';
import type { RescueOperationsMetrics, TimeRangeFilter } from '../types/analytics';

export const analyticsApi = {
  getOperationsMetrics: async (
    range: TimeRangeFilter = '7_DAYS',
    from?: string,
    to?: string
  ): Promise<RescueOperationsMetrics> => {
    const res: any = await axiosClient.get('/admin/analytics/operations', {
      params: { range, from, to }
    });
    return res.data?.data || res.data || res;
  },

  getFinancialAnalytics: async (
    range: TimeRangeFilter = '7_DAYS',
    from?: string,
    to?: string
  ): Promise<import('../types/analytics').FinancialAnalyticsMetrics> => {
    const res: any = await axiosClient.get('/admin/analytics/finance', {
      params: { range, from, to }
    });
    return res.data?.data || res.data || res;
  }
};

