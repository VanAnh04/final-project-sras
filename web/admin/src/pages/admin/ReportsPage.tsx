import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  RefreshCw, 
  Activity, 
  DollarSign, 
  MapPin, 
  Users, 
  AlertCircle 
} from 'lucide-react';
import { analyticsApi } from '../../api/analyticsApi';
import type { 
  RescueOperationsMetrics, 
  FinancialAnalyticsMetrics, 
  IncidentAnalyticsMetrics,
  PartnerAnalyticsMetrics,
  AiAnalyticsInsight,
  TimeRangeFilter 
} from '../../types/analytics';
import { AiOperationsInsightsCard } from '../../components/analytics/AiOperationsInsightsCard';
import { AiFinancialInsightsCard } from '../../components/analytics/AiFinancialInsightsCard';
import { AiIncidentInsightsCard } from '../../components/analytics/AiIncidentInsightsCard';
import { AiPartnerInsightsCard } from '../../components/analytics/AiPartnerInsightsCard';
import { OperationsSlaCards } from '../../components/analytics/OperationsSlaCards';
import { RescueFunnelCard } from '../../components/analytics/RescueFunnelCard';
import { CancellationAnalyticsCard } from '../../components/analytics/CancellationAnalyticsCard';
import { DailyTrendChart } from '../../components/analytics/DailyTrendChart';
import { FinancialKpiCards } from '../../components/analytics/FinancialKpiCards';
import { RevenueTrendAreaChart } from '../../components/analytics/RevenueTrendAreaChart';
import { FeeBreakdownDonutChart } from '../../components/analytics/FeeBreakdownDonutChart';
import { PaymentMethodCard } from '../../components/analytics/PaymentMethodCard';
import { IncidentOverviewCards } from '../../components/analytics/IncidentOverviewCards';
import { PeakHoursBarChart } from '../../components/analytics/PeakHoursBarChart';
import { TopIssueTypesChart } from '../../components/analytics/TopIssueTypesChart';
import { IncidentHotspotsList } from '../../components/analytics/IncidentHotspotsList';
import { IncidentHeatmapMap } from '../../components/analytics/IncidentHeatmapMap';
import { PartnerOverviewCards } from '../../components/analytics/PartnerOverviewCards';
import { TopGaragesTable } from '../../components/analytics/TopGaragesTable';
import { TopTechniciansList } from '../../components/analytics/TopTechniciansList';
import { PartnerRiskWatchlistCard } from '../../components/analytics/PartnerRiskWatchlistCard';

type ActiveTab = 'OPERATIONS' | 'FINANCE' | 'INCIDENTS' | 'PARTNERS';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('OPERATIONS');
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('7_DAYS');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [operationsData, setOperationsData] = useState<RescueOperationsMetrics | null>(null);
  const [financialData, setFinancialData] = useState<FinancialAnalyticsMetrics | null>(null);
  const [incidentData, setIncidentData] = useState<IncidentAnalyticsMetrics | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerAnalyticsMetrics | null>(null);

  // Trục 1: AI Insights
  const [operationsAiInsight, setOperationsAiInsight] = useState<AiAnalyticsInsight | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Trục 2: AI Insights
  const [financialAiInsight, setFinancialAiInsight] = useState<AiAnalyticsInsight | null>(null);
  const [financialAiLoading, setFinancialAiLoading] = useState<boolean>(false);

  // Trục 3: AI Insights
  const [incidentAiInsight, setIncidentAiInsight] = useState<AiAnalyticsInsight | null>(null);
  const [incidentAiLoading, setIncidentAiLoading] = useState<boolean>(false);

  // Trục 4: AI Insights
  const [partnerAiInsight, setPartnerAiInsight] = useState<AiAnalyticsInsight | null>(null);
  const [partnerAiLoading, setPartnerAiLoading] = useState<boolean>(false);

  const fetchPartnerAiInsights = useCallback(async (forceRefresh: boolean = false) => {
    setPartnerAiLoading(true);
    try {
      const data = await analyticsApi.getPartnerAiInsights(
        timeRange,
        timeRange === 'CUSTOM' ? customFrom : undefined,
        timeRange === 'CUSTOM' ? customTo : undefined,
        forceRefresh
      );
      setPartnerAiInsight(data);
    } catch (err: any) {
      console.warn('Lỗi tải đề xuất AI đối tác & thợ:', err);
    } finally {
      setPartnerAiLoading(false);
    }
  }, [timeRange, customFrom, customTo]);

  const fetchIncidentAiInsights = useCallback(async (forceRefresh: boolean = false) => {
    setIncidentAiLoading(true);
    try {
      const data = await analyticsApi.getIncidentAiInsights(
        timeRange,
        timeRange === 'CUSTOM' ? customFrom : undefined,
        timeRange === 'CUSTOM' ? customTo : undefined,
        forceRefresh
      );
      setIncidentAiInsight(data);
    } catch (err: any) {
      console.warn('Lỗi tải đề xuất AI sự cố & điểm nóng:', err);
    } finally {
      setIncidentAiLoading(false);
    }
  }, [timeRange, customFrom, customTo]);

  const fetchFinancialAiInsights = useCallback(async (forceRefresh: boolean = false) => {
    setFinancialAiLoading(true);
    try {
      const data = await analyticsApi.getFinancialAiInsights(
        timeRange,
        timeRange === 'CUSTOM' ? customFrom : undefined,
        timeRange === 'CUSTOM' ? customTo : undefined,
        forceRefresh
      );
      setFinancialAiInsight(data);
    } catch (err: any) {
      console.warn('Lỗi tải đề xuất AI tài chính:', err);
    } finally {
      setFinancialAiLoading(false);
    }
  }, [timeRange, customFrom, customTo]);

  const fetchOperationsAiInsights = useCallback(async (forceRefresh: boolean = false) => {
    setAiLoading(true);
    try {
      const data = await analyticsApi.getOperationsAiInsights(
        timeRange,
        timeRange === 'CUSTOM' ? customFrom : undefined,
        timeRange === 'CUSTOM' ? customTo : undefined,
        forceRefresh
      );
      setOperationsAiInsight(data);
    } catch (err: any) {
      console.warn('Lỗi tải đề xuất AI vận hành:', err);
    } finally {
      setAiLoading(false);
    }
  }, [timeRange, customFrom, customTo]);

  const fetchOperationsMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getOperationsMetrics(
        timeRange,
        timeRange === 'CUSTOM' ? customFrom : undefined,
        timeRange === 'CUSTOM' ? customTo : undefined
      );
      setOperationsData(data);
      // Tải kèm AI insights cho Trục 1
      fetchOperationsAiInsights(false);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu vận hành & SLA:', err);
      setError(err?.response?.data?.message || 'Không thể tải số liệu phân tích vận hành. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }, [timeRange, customFrom, customTo, fetchOperationsAiInsights]);

  const fetchFinancialMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getFinancialAnalytics(
        timeRange,
        timeRange === 'CUSTOM' ? customFrom : undefined,
        timeRange === 'CUSTOM' ? customTo : undefined
      );
      setFinancialData(data);
      // Tải kèm AI insights cho Trục 2
      fetchFinancialAiInsights(false);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu tài chính & doanh thu:', err);
      setError(err?.response?.data?.message || 'Không thể tải số liệu phân tích tài chính. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }, [timeRange, customFrom, customTo, fetchFinancialAiInsights]);

  const fetchIncidentMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getIncidentAnalytics(
        timeRange,
        timeRange === 'CUSTOM' ? customFrom : undefined,
        timeRange === 'CUSTOM' ? customTo : undefined
      );
      setIncidentData(data);
      // Tải kèm AI insights cho Trục 3
      fetchIncidentAiInsights(false);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu sự cố & bản đồ:', err);
      setError(err?.response?.data?.message || 'Không thể tải số liệu phân tích sự cố. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }, [timeRange, customFrom, customTo, fetchIncidentAiInsights]);

  const fetchPartnerMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getPartnerAnalytics(
        timeRange,
        timeRange === 'CUSTOM' ? customFrom : undefined,
        timeRange === 'CUSTOM' ? customTo : undefined
      );
      setPartnerData(data);
      // Tải kèm AI insights cho Trục 4
      fetchPartnerAiInsights(false);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu đối tác & thợ:', err);
      setError(err?.response?.data?.message || 'Không thể tải số liệu phân tích đối tác. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }, [timeRange, customFrom, customTo, fetchPartnerAiInsights]);

  useEffect(() => {
    if (activeTab === 'OPERATIONS') {
      fetchOperationsMetrics();
    } else if (activeTab === 'FINANCE') {
      fetchFinancialMetrics();
    } else if (activeTab === 'INCIDENTS') {
      fetchIncidentMetrics();
    } else if (activeTab === 'PARTNERS') {
      fetchPartnerMetrics();
      fetchPartnerAiInsights(true);
    }
  }, [fetchOperationsMetrics, fetchFinancialMetrics, fetchIncidentMetrics, fetchPartnerMetrics, activeTab]);

  const handleRefresh = () => {
    if (activeTab === 'OPERATIONS') {
      fetchOperationsMetrics();
      fetchOperationsAiInsights(true);
    } else if (activeTab === 'FINANCE') {
      fetchFinancialMetrics();
      fetchFinancialAiInsights(true);
    } else if (activeTab === 'INCIDENTS') {
      fetchIncidentMetrics();
      fetchIncidentAiInsights(true);
    } else if (activeTab === 'PARTNERS') {
      fetchPartnerMetrics();
      fetchPartnerAiInsights(true);
    }
  };



  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Trung tâm Phân tích Dữ liệu Hệ thống
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Báo cáo chuyên sâu về vận hành cứu hộ, tốc độ phản hồi, tài chính và mạng lưới đối tác
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Buttons */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setTimeRange('TODAY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === 'TODAY'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setTimeRange('7_DAYS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === '7_DAYS'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setTimeRange('30_DAYS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === '30_DAYS'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              30 ngày qua
            </button>
            <button
              onClick={() => setTimeRange('THIS_MONTH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === 'THIS_MONTH'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setTimeRange('CUSTOM')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeRange === 'CUSTOM'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Tùy chọn
            </button>
          </div>

          {/* Custom Date Pickers */}
          {timeRange === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium text-gray-700 outline-none"
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium text-gray-700 outline-none"
              />
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-gray-50 text-gray-600 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 rounded-xl transition-all disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs (Các trục phân tích) */}
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('OPERATIONS')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'OPERATIONS'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Trục 1: Vận hành & Tốc độ phản hồi
        </button>

        <button
          onClick={() => setActiveTab('FINANCE')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'FINANCE'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Trục 2: Tài chính & Doanh thu Sàn
        </button>

        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'INCIDENTS'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Trục 3: Sự cố & Bản đồ
        </button>

        <button
          onClick={() => setActiveTab('PARTNERS')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === 'PARTNERS'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-xl'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Trục 4: Đối tác & Đội ngũ thợ
        </button>
      </div>

      {/* 3. Main Content: Trục 1 - Vận hành & SLA */}
      {activeTab === 'OPERATIONS' && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Operations Insights & SLA Action Recommendations */}
          <AiOperationsInsightsCard 
            insight={operationsAiInsight}
            loading={aiLoading}
            onRefresh={() => fetchOperationsAiInsights(true)}
          />

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500">Đang tổng hợp chỉ số vận hành & tốc độ phản hồi cứu hộ...</p>
            </div>
          ) : operationsData ? (
            <>
              {/* Row 1: Thẻ KPI SLA */}
              <OperationsSlaCards metrics={operationsData} />

              {/* Row 2: Phễu cứu hộ 5 bước */}
              <RescueFunnelCard funnel={operationsData.funnel} />

              {/* Row 3: Biểu đồ xu hướng ngày & Phân tích hủy */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DailyTrendChart dailyTrends={operationsData.dailyTrends} />
                <CancellationAnalyticsCard 
                  breakdown={operationsData.cancellationBreakdown}
                  totalCancelled={operationsData.cancelledRequests}
                />
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl text-center border border-gray-100">
              <p className="text-gray-400">Không tìm thấy dữ liệu vận hành trong chu kỳ này.</p>
            </div>
          )}
        </div>
      )}

      {/* 4. Main Content: Trục 2 - Tài chính & Doanh thu Sàn */}
      {activeTab === 'FINANCE' && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Financial Insights & Cash Flow Recommendations */}
          <AiFinancialInsightsCard 
            insight={financialAiInsight}
            loading={financialAiLoading}
            onRefresh={() => fetchFinancialAiInsights(true)}
          />

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500">Đang phân tích dòng tiền và hoa hồng nền tảng...</p>
            </div>
          ) : financialData ? (
            <>
              {/* Row 1: Thẻ KPI Tài chính */}
              <FinancialKpiCards metrics={financialData} />

              {/* Row 2: Biểu đồ miền GMV vs Hoa hồng sàn */}
              <RevenueTrendAreaChart dailyTrends={financialData.dailyTrends} />

              {/* Row 3: Cơ cấu nguồn thu & Phương thức thanh toán */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FeeBreakdownDonutChart feeBreakdown={financialData.feeBreakdown} />
                <PaymentMethodCard paymentBreakdown={financialData.paymentBreakdown} />
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl text-center border border-gray-100">
              <p className="text-gray-400">Không tìm thấy dữ liệu tài chính trong chu kỳ này.</p>
            </div>
          )}
        </div>
      )}

      {/* 5. Main Content: Trục 3 - Sự cố & Bản đồ */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Incident Insights & Hotspots Action Recommendations */}
          <AiIncidentInsightsCard 
            insight={incidentAiInsight}
            loading={incidentAiLoading}
            onRefresh={() => fetchIncidentAiInsights(true)}
          />

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500">Đang phân tích loại sự cố và mật độ 24 giờ...</p>
            </div>
          ) : incidentData ? (
            <>
              {/* Row 1: Thẻ KPI Sự cố & Phương tiện */}
              <IncidentOverviewCards metrics={incidentData} />

              {/* Row 2: Bản đồ Sự cố tương tác có phân màu theo mức độ */}
              <IncidentHeatmapMap mapPoints={incidentData.mapPoints || []} />

              {/* Row 3: Biểu đồ cột 24 giờ cao điểm */}
              <PeakHoursBarChart 
                hourlyDistribution={incidentData.hourlyDistribution} 
                peakHourLabel={incidentData.peakHourLabel}
              />

              {/* Row 4: Top sự cố phổ biến & Điểm nóng địa bàn */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopIssueTypesChart topIssueTypes={incidentData.topIssueTypes} />
                <IncidentHotspotsList topHotspots={incidentData.topHotspots} />
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl text-center border border-gray-100">
              <p className="text-gray-400">Không tìm thấy dữ liệu sự cố trong chu kỳ này.</p>
            </div>
          )}
        </div>
      )}

      {/* 6. Main Content: Trục 4 - Đối tác Gara & Đội ngũ Kỹ thuật viên */}
      {activeTab === 'PARTNERS' && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500">Đang phân tích hiệu suất đối tác gara và kỹ thuật viên...</p>
            </div>
          ) : partnerData ? (
            <>
              {/* Row 0: Đề xuất & Nhận định AI Trục 4 */}
              <AiPartnerInsightsCard
                insight={partnerAiInsight}
                loading={partnerAiLoading}
                onRefresh={() => fetchPartnerAiInsights(true)}
              />

              {/* Row 1: Thẻ KPI Tổng quan Đối tác */}
              <PartnerOverviewCards metrics={partnerData} />

              {/* Row 2: Bảng xếp hạng Gara */}
              <TopGaragesTable garages={partnerData.topGarages || []} />

              {/* Row 3: Top Kỹ thuật viên & Cảnh báo rủi ro / Năng lực */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <TopTechniciansList technicians={partnerData.topTechnicians || []} />
                </div>
                <div className="lg:col-span-2">
                  <PartnerRiskWatchlistCard 
                    watchlist={partnerData.riskWatchlist || []} 
                    capabilities={partnerData.capabilityBreakdown || []} 
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-2xl text-center border border-gray-100">
              <p className="text-gray-400">Không tìm thấy dữ liệu đối tác trong chu kỳ này.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

