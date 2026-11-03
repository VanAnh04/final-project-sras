import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  ShieldAlert,
  Sliders,
  Compass
} from 'lucide-react';
import type { AiAnalyticsInsight, AiActionRecommendation } from '../../types/analytics';

interface Props {
  insight: AiAnalyticsInsight | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AiIncidentInsightsCard: React.FC<Props> = ({ insight, loading, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'URGENT' | 'OPTIMIZATION' | 'STRATEGIC'>('ALL');

  if (!insight && !loading) {
    return (
      <div className="bg-gradient-to-r from-orange-900/5 via-amber-900/5 to-rose-900/5 border border-orange-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-200">
            <MapPin className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
              Trợ Lý AI Phân Tích Điểm Nóng Sự Cố & Mật Độ Khu Vực
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-50 text-orange-700 border border-orange-200">
                Gemini AI
              </span>
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Chưa có dữ liệu phân tích sự cố cho chu kỳ này. Nhấn nút bên cạnh để kích hoạt AI.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-orange-200 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          ✨ Phân Tích Bằng Gemini AI
        </button>
      </div>
    );
  }

  // Filter recommendations
  const recommendations = insight?.recommendations || [];
  const filteredRecs = recommendations.filter((rec) => {
    if (activeFilter === 'ALL') return true;
    return rec.priority === activeFilter;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            Khẩn cấp (P1)
          </span>
        );
      case 'OPTIMIZATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            Tối ưu phân bổ (P2)
          </span>
        );
      case 'STRATEGIC':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            Chiến lược vùng phủ (P3)
          </span>
        );
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return { label: 'Vùng phủ Tốt', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'STABLE':
        return { label: 'Ổn định', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'WARNING':
        return { label: 'Cần chú ý điểm nóng', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'CRITICAL':
      default:
        return { label: 'Quá tải cục bộ', color: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  const health = getHealthBadge(insight?.overallHealthStatus || 'STABLE');

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden transition-all">
      {/* 1. Header Card */}
      <div className="bg-gradient-to-r from-orange-900/5 via-amber-900/5 to-rose-900/5 p-5 border-b border-orange-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-orange-200">
            <MapPin className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900 text-sm md:text-base">
                Trợ Lý AI Phân Tích Điểm Nóng Sự Cố & Mật Độ Khu Vực
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800">
                Gemini 3.5 Flash
              </span>
              {insight?.fromCache && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                  Từ bộ nhớ đệm
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Phát hiện cụm sự cố theo giờ tan tầm, mật độ ca đêm và đề xuất bố trí đội cứu hộ trực chiến lưu động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
            title="Làm mới phân tích AI"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Loading state */}
      {loading && (
        <div className="p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-orange-50 text-orange-600 animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-gray-600">Gemini AI đang phân tích dữ liệu bản đồ nhiệt & mật độ điểm nóng sự cố...</p>
        </div>
      )}

      {/* 3. Main Content Body */}
      {!loading && insight && isExpanded && (
        <div className="p-5 space-y-6">
          {/* Row 1: Executive Summary & Health Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            {/* Safety Score */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200/80 pb-4 lg:pb-0 lg:pr-4">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Điểm Sẵn Sàng Ứng Cứu
              </span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-3xl font-black text-gray-900">{insight.healthScore}</span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${health.color}`}>
                {health.label}
              </span>
            </div>

            {/* Executive Summary */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 mb-1">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                Nhận Định Mật Độ Giao Thông Từ AI
              </div>
              <p className="text-xs md:text-sm text-gray-700 leading-relaxed font-medium">
                {insight.executiveSummary}
              </p>
              <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Cập nhật lúc: {new Date(insight.generatedAt).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Row 2: Highlights vs Bottlenecks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highlights */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30">
              <h5 className="font-bold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Điểm Sáng Điều Phối Theo Địa Bàn
              </h5>
              <div className="space-y-2.5">
                {insight.highlights?.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-100/60 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-xs">{item.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700">
                        {item.metric}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottlenecks */}
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30">
              <h5 className="font-bold text-xs text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Nguy Cơ & Điểm Nóng Quá Tải
              </h5>
              <div className="space-y-2.5">
                {insight.bottlenecks?.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-rose-100/60 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-xs">{item.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700">
                        {item.metric}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Actionable Recommendations */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-600" />
                  Đề Xuất Hành Động Tối Ưu Bố Trí Đội Cứu Hộ
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">
                    {recommendations.length} đề xuất
                  </span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Các giải pháp điều phối trực chiến điểm nóng, hỗ trợ ca đêm và tăng cường phương tiện chuyên dụng
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tất cả ({recommendations.length})
                </button>
                <button
                  onClick={() => setActiveFilter('URGENT')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === 'URGENT' ? 'bg-red-50 text-red-700 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🔴 Khẩn cấp
                </button>
                <button
                  onClick={() => setActiveFilter('OPTIMIZATION')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === 'OPTIMIZATION' ? 'bg-amber-50 text-amber-700 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🟡 Tối ưu
                </button>
                <button
                  onClick={() => setActiveFilter('STRATEGIC')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === 'STRATEGIC' ? 'bg-emerald-50 text-emerald-700 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🟢 Chiến lược
                </button>
              </div>
            </div>

            {/* Recommendation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredRecs.map((rec: AiActionRecommendation) => (
                <div
                  key={rec.id}
                  className="bg-white p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {getPriorityBadge(rec.priority)}
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {rec.category}
                      </span>
                    </div>

                    <h5 className="font-extrabold text-gray-900 text-xs mb-2 group-hover:text-orange-600 transition-colors">
                      {rec.title}
                    </h5>

                    <div className="space-y-2 mb-3">
                      <div className="text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <strong className="text-gray-700 block mb-0.5">Vấn đề:</strong>
                        {rec.problemStatement}
                      </div>

                      <div className="text-[11px] text-orange-950 bg-orange-50/50 p-2.5 rounded-lg border border-orange-100">
                        <strong className="text-orange-950 block mb-0.5">Hành động đề xuất:</strong>
                        {rec.proposedAction}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Kỳ vọng:</span>
                    <span className="font-bold text-emerald-600 text-right">{rec.expectedImpact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
