import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Flame, TrendingUp, TrendingDown, Users, Car, MapPin, ChevronRight, AlertTriangle, Store } from 'lucide-react';
import IncidentDrawer from '../../components/dashboard/IncidentDrawer';
import axiosClient from '../../api/axiosClient';

const areaData = [
  { time: '00:00', value: 10 },
  { time: '04:00', value: 20 },
  { time: '08:00', value: 150 },
  { time: '12:00', value: 250 },
  { time: '16:00', value: 380 },
  { time: '20:00', value: 200 },
  { time: '23:59', value: 80 },
];

export default function Dashboard() {
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [techStats, setTechStats] = useState<{ TOTAL: number; ACTIVE: number; FREE: number; BUSY: number } | null>(null);

  useEffect(() => {
    axiosClient.get('/admin/technicians/stats')
      .then((res: unknown) => {
        const responseData = res as { data?: { TOTAL?: number; ACTIVE?: number; FREE?: number; BUSY?: number }; TOTAL?: number; ACTIVE?: number; FREE?: number; BUSY?: number };
        const data = responseData?.data || responseData;
        if (data && typeof data === 'object') {
          setTechStats({
            TOTAL: Number(data.TOTAL || 0),
            ACTIVE: Number(data.ACTIVE || 0),
            FREE: Number(data.FREE || 0),
            BUSY: Number(data.BUSY || 0)
          });
        }
      })
      .catch((err: unknown) => console.warn('Dashboard fetch tech stats err:', err));
  }, []);

  const pieData = [
    { name: 'Đang làm nhiệm vụ', value: techStats ? techStats.BUSY : 142, color: '#22c55e' },
    { name: 'Sẵn sàng điều động', value: techStats ? techStats.FREE : 156, color: '#f97316' },
    { name: 'Nghỉ / Không hoạt động', value: techStats ? (techStats.TOTAL - techStats.ACTIVE) : 28, color: '#ef4444' },
  ];

  return (
    <div className="flex gap-6 max-w-[1600px] mx-auto">
      {/* Left Column */}
      <div className="flex-1 space-y-6 min-w-0">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tổng ca cứu hộ</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-extrabold text-gray-900">1,482</span>
                <span className="text-xs font-bold text-green-500 ml-2 flex items-center inline-flex">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
                </span>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Tăng trưởng so với tháng trước</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Doanh thu</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-extrabold text-gray-900">482M</span>
                <span className="text-xs font-bold text-green-500 ml-2 flex items-center inline-flex">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +8.4%
                </span>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">VNĐ / Tháng này</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gara đang hoạt động</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-extrabold text-gray-900">84</span>
                <span className="text-xs font-bold text-red-500 ml-2 flex items-center inline-flex">
                  <TrendingDown className="w-3 h-3 mr-0.5" /> -2%
                </span>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">3 gara đang bảo trì</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Kỹ thuật viên</p>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-extrabold text-gray-900">{techStats ? techStats.TOTAL : '...'}</span>
                <span className="text-xs font-bold text-green-500 ml-2 flex items-center inline-flex">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> {techStats ? `${techStats.ACTIVE} hoạt động` : ''}
                </span>
              </div>
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{techStats ? `${techStats.FREE} sẵn sàng điều động` : 'Sẵn sàng điều động'}</p>
          </div>
        </div>

        {/* Chart Area */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Lưu lượng ca cứu hộ</h3>
              <p className="text-sm text-gray-500">Thống kê theo thời gian thực (24 giờ qua)</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button className="px-4 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-md shadow-sm">GIỜ</button>
              <button className="px-4 py-1.5 text-gray-500 hover:text-gray-900 text-xs font-bold rounded-md transition-colors">NGÀY</button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Status Pie */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Trạng thái đội ngũ</h3>
              <div className="space-y-4">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Map Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group cursor-pointer">
            <img 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop" 
              alt="Map" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent flex items-end p-6">
              <div className="absolute top-4 right-4 bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                TRỰC TIẾP
              </div>
              <button className="bg-white/90 backdrop-blur-sm text-gray-900 font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:bg-white transition-colors">
                Bản đồ điều phối thời gian thực
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Right Column - Alerts */}
      <div className="w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-8rem)] sticky top-24">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Cảnh báo va chạm AI</h3>
              <p className="text-xs text-gray-500">Phát hiện tự động từ cảm biến IoT</p>
            </div>
          </div>
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Alert Card 1 */}
          <div className="border border-gray-100 rounded-xl p-4 hover:border-orange-200 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Toyota Camry • 30A-123.45</h4>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Car className="w-3 h-3" /> Cách đây 2 phút • Ngã tư Hàng Xanh
                </p>
              </div>
              <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-md border border-red-100">
                4.8G
              </span>
            </div>
            <button 
              onClick={() => setSelectedIncident('AI-9421')}
              className="w-full bg-orange-500 text-white font-bold py-2 rounded-lg text-xs hover:bg-orange-600 transition-colors"
            >
              Mô phỏng sự cố
            </button>
          </div>

          {/* Alert Card 2 */}
          <div className="border border-gray-100 rounded-xl p-4 hover:border-orange-200 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <h4 className="font-bold text-gray-900 text-sm">Mazda CX-5 • 51H-999.88</h4>
                </div>
                <p className="text-xs text-gray-500 mt-1">Cách đây 15 phút • Cao tốc Long Thành</p>
              </div>
              <span className="bg-yellow-50 text-yellow-600 text-xs font-bold px-2 py-1 rounded-md border border-yellow-100">
                2.1G
              </span>
            </div>
            <button 
              onClick={() => setSelectedIncident('AI-9422')}
              className="w-full bg-white text-orange-500 border border-orange-200 font-bold py-2 rounded-lg text-xs hover:bg-orange-50 transition-colors"
            >
              Xem chi tiết
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button className="w-full text-center text-sm font-bold text-orange-500 hover:text-orange-600">
            Xem tất cả báo cáo AI
          </button>
        </div>
      </div>

      <IncidentDrawer 
        isOpen={!!selectedIncident} 
        onClose={() => setSelectedIncident(null)} 
        incidentId={selectedIncident || ''} 
      />
    </div>
  );
}
