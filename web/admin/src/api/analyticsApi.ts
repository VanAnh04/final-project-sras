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
  },

  getIncidentAnalytics: async (
    range: TimeRangeFilter = '7_DAYS',
    from?: string,
    to?: string
  ): Promise<import('../types/analytics').IncidentAnalyticsMetrics> => {
    const res: any = await axiosClient.get('/admin/analytics/incidents', {
      params: { range, from, to }
    });
    return res.data?.data || res.data || res;
  },

  getPartnerAnalytics: async (
    range: TimeRangeFilter = '7_DAYS',
    from?: string,
    to?: string
  ): Promise<import('../types/analytics').PartnerAnalyticsMetrics> => {
    const res: any = await axiosClient.get('/admin/analytics/partners', {
      params: { range, from, to }
    });
    return res.data?.data || res.data || res;
  },

  getOperationsAiInsights: async (
    range: TimeRangeFilter = '7_DAYS',
    from?: string,
    to?: string,
    forceRefresh: boolean = false
  ): Promise<import('../types/analytics').AiAnalyticsInsight> => {
    const res: any = await axiosClient.get('/admin/analytics/operations/ai-insights', {
      params: { range, from, to, forceRefresh }
    });
    return res.data?.data || res.data || res;
  },

  getFinancialAiInsights: async (
    range: TimeRangeFilter = '7_DAYS',
    from?: string,
    to?: string,
    forceRefresh: boolean = false
  ): Promise<import('../types/analytics').AiAnalyticsInsight> => {
    const res: any = await axiosClient.get('/admin/analytics/finance/ai-insights', {
      params: { range, from, to, forceRefresh }
    });
    return res.data?.data || res.data || res;
  }
};


