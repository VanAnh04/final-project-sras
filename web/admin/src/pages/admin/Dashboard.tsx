import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Flame, TrendingUp, Users, Store, Calendar, RefreshCw
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import PartnerGaragesMap from '../../components/dashboard/PartnerGaragesMap';
import { analyticsApi } from '../../api/analyticsApi';
import type { 
  RescueOperationsMetrics, 
  FinancialAnalyticsMetrics, 
  IncidentAnalyticsMetrics 
} from '../../types/analytics';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'HOURLY' | 'DAILY'>('HOURLY');

  // Metrics state
  const [operationsMetrics, setOperationsMetrics] = useState<RescueOperationsMetrics | null>(null);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialAnalyticsMetrics | null>(null);
  const [incidentMetrics, setIncidentMetrics] = useState<IncidentAnalyticsMetrics | null>(null);

  const [garageStats, setGarageStats] = useState<{
    APPROVED: number;
    PENDING: number;
    SUSPENDED: number;
    REJECTED: number;
    TOTAL: number;
  } | null>(null);

  const [techStats, setTechStats] = useState<{
    TOTAL: number;
    ACTIVE: number;
    FREE: number;
    BUSY: number;
  } | null>(null);

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const [ops, fin, inc, garRes, techRes]: any = await Promise.allSettled([
        analyticsApi.getOperationsMetrics('TODAY'),
        analyticsApi.getFinancialAnalytics('TODAY'),
        analyticsApi.getIncidentAnalytics('TODAY'),
        axiosClient.get('/admin/garages/stats'),
        axiosClient.get('/admin/technicians/stats'),
      ]);

      if (ops.status === 'fulfilled' && ops.value) {
        setOperationsMetrics(ops.value);
      }
      if (fin.status === 'fulfilled' && fin.value) {
        setFinancialMetrics(fin.value);
      }
      if (inc.status === 'fulfilled' && inc.value) {
        setIncidentMetrics(inc.value);
      }
      if (garRes.status === 'fulfilled' && garRes.value?.data) {
        setGarageStats(garRes.value.data);
      }
      if (techRes.status === 'fulfilled') {
        const data = techRes.value?.data || techRes.value;
        if (data && typeof data === 'object') {
          setTechStats({
            TOTAL: Number(data.TOTAL || 0),
            ACTIVE: Number(data.ACTIVE || 0),
            FREE: Number(data.FREE || 0),
            BUSY: Number(data.BUSY || 0),
          });
        }
      }
    } catch (err) {
      console.warn('Dashboard fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const formatVnd = (num?: number) => {
    if (!num) return '0 đ';
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(1)}B đ`;
    }
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M đ`;
    }
    return `${num.toLocaleString('vi-VN')} đ`;
  };

  // Pie chart data for team technicians
  const pieData = [
    { name: 'Đang làm nhiệm vụ', value: techStats ? techStats.BUSY : 0, color: '#22c55e' },
    { name: 'Sẵn sàng điều động', value: techStats ? techStats.FREE : 0, color: '#f97316' },
    { 
      name: 'Nghỉ / Không hoạt động', 
      value: techStats ? Math.max(0, techStats.TOTAL - techStats.ACTIVE) : 0, 
      color: '#ef4444' 
    },
  ];

  // Chart data: 24h of today or 7-day trend
  const chartData = chartMode === 'HOURLY'
    ? (incidentMetrics?.hourlyDistribution && incidentMetrics.hourlyDistribution.length > 0
        ? incidentMetrics.hourlyDistribution.map((h) => ({ time: h.label, value: h.count }))
        : Array.from({ length: 24 }, (_, i) => ({
            time: `${String(i).padStart(2, '0')}:00`,
            value: 0,
          }))
      )
    : (operationsMetrics?.dailyTrends && operationsMetrics.dailyTrends.length > 0
        ? operationsMetrics.dailyTrends.map((d) => ({ time: d.date.slice(5), value: d.total }))
        : [
            { time: 'T2', value: 0 },
            { time: 'T3', value: 0 },
            { time: 'T4', value: 0 },
            { time: 'T5', value: 0 },
            { time: 'T6', value: 0 },
            { time: 'T7', value: 0 },
            { time: 'CN', value: 0 },
          ]
      );

  return (
    <div className="w-full space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {/* Top Header Information Bar for Today */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Bảng điều khiển hệ thống</h1>
            <p className="text-xs text-gray-500">
              Dữ liệu vận hành cập nhật cho ngày hiện tại ({new Date().toLocaleDateString('vi-VN')})
            </p>
          </div>
        </div>
        <button
          onClick={fetchTodayData}
          disabled={loading}
          className="self-start sm:self-center px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* KPI Cards for TODAY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng ca cứu hộ hôm nay */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Tổng ca cứu hộ hôm nay
          </p>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-gray-900">
                {operationsMetrics?.totalRequests ?? 0}
              </span>
              <span className="text-xs font-bold text-green-600 ml-2 inline-flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                {operationsMetrics?.activeRequests
                  ? `${operationsMetrics.activeRequests} đang xử lý`
                  : 'Sẵn sàng'}
              </span>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Đã hoàn thành {operationsMetrics?.completedRequests ?? 0} ca (Tỷ lệ {operationsMetrics?.successRate ?? 0}%)
          </p>
        </div>

        {/* Card 2: Doanh thu hôm nay */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Doanh thu hôm nay
          </p>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-gray-900">
                {formatVnd(financialMetrics?.totalGmv ?? 0)}
              </span>
              <span className="text-xs font-bold text-green-600 ml-2 inline-flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                {financialMetrics?.completedOrderCount ?? 0} đơn
              </span>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Hoa hồng sàn: {formatVnd(financialMetrics?.totalCommission ?? 0)}
          </p>
        </div>

        {/* Card 3: Gara đang hoạt động */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Gara đang hoạt động
          </p>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-gray-900">
                {garageStats?.APPROVED ?? 0}
              </span>
              <span className="text-xs font-bold text-orange-600 ml-2 inline-flex items-center">
                {garageStats?.PENDING ? `${garageStats.PENDING} chờ duyệt` : '0 chờ duyệt'}
              </span>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {garageStats?.TOTAL ?? 0} tổng đối tác gara trong hệ thống
          </p>
        </div>

        {/* Card 4: Kỹ thuật viên */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Kỹ thuật viên
          </p>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-extrabold text-gray-900">
                {techStats ? techStats.TOTAL : 0}
              </span>
              <span className="text-xs font-bold text-green-600 ml-2 inline-flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                {techStats ? `${techStats.ACTIVE} hoạt động` : '0 hoạt động'}
              </span>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {techStats ? `${techStats.FREE} sẵn sàng điều động` : 'Sẵn sàng điều động'}
          </p>
        </div>
      </div>

      {/* Chart Area: Lưu lượng ca cứu hộ */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Lưu lượng ca cứu hộ</h3>
            <p className="text-sm text-gray-500">
              {chartMode === 'HOURLY'
                ? `Thống kê theo 24 khung giờ trong ngày hiện tại (${new Date().toLocaleDateString('vi-VN')})`
                : 'Thống kê theo các ngày trong tuần'}
            </p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setChartMode('HOURLY')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm transition-all ${
                chartMode === 'HOURLY'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              GIỜ
            </button>
            <button
              onClick={() => setChartMode('DAILY')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                chartMode === 'DAILY'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              NGÀY
            </button>
          </div>
        </div>

        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(val: any) => [`${val} ca cứu hộ`, 'Lưu lượng']}
                labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Pie */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Trạng thái đội ngũ kỹ thuật</h3>
            <div className="space-y-4">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.value} người</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-44 h-44 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={50}
                  outerRadius={68}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`${val} kỹ thuật viên`, 'Số lượng']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interactive Partner Garages Goong Map */}
        <PartnerGaragesMap />
      </div>

    </div>
  );
}
