import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  ShieldAlert,
  Sliders,
  Award,
  Users
} from 'lucide-react';
import type { AiAnalyticsInsight, AiActionRecommendation } from '../../types/analytics';

interface Props {
  insight: AiAnalyticsInsight | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AiPartnerInsightsCard: React.FC<Props> = ({ insight, loading, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'URGENT' | 'OPTIMIZATION' | 'STRATEGIC'>('ALL');

  if (!insight && !loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-900/5 via-purple-900/5 to-blue-900/5 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Building2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
              Phân Tích Hiệu Suất Đối Tác Gara & Kỹ Thuật Viên
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Chưa có dữ liệu phân tích đối tác cho chu kỳ này. Nhấn nút bên cạnh để phân tích dữ liệu.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          ✨ Phân Tích Dữ Liệu
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
            Tối ưu điều phối (P2)
          </span>
        );
      case 'STRATEGIC':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Award className="w-3.5 h-3.5 text-indigo-600" />
            Chiến lược mạng lưới (P3)
          </span>
        );
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'RISK_WATCHLIST':
        return { label: 'Cảnh báo rủi ro', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'TECHNICIAN_LOAD':
        return { label: 'Tải kỹ thuật viên', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'REWARD_PROGRAM':
        return { label: 'Chính sách thưởng 5 sao', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'CAPACITY':
      default:
        return { label: 'Năng lực mạng lưới', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return { label: 'Mạng lưới Vững mạnh', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'STABLE':
        return { label: 'Hoạt động Ổn định', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'WARNING':
        return { label: 'Cảnh báo hiệu suất', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'CRITICAL':
      default:
        return { label: 'Rủi ro mạng lưới cao', color: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  const health = getHealthBadge(insight?.overallHealthStatus || 'STABLE');

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden transition-all">
      {/* 1. Header Card */}
      <div className="bg-gradient-to-r from-indigo-900/5 via-purple-900/5 to-blue-900/5 p-5 border-b border-indigo-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Building2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900 text-sm md:text-base">
                Phân Tích Hiệu Suất Đối Tác Gara & Kỹ Thuật Viên
              </h3>
              {insight?.fromCache && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                  Từ bộ nhớ đệm
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Đánh giá bảng xếp hạng gara, vinh danh thợ xuất sắc, phát hiện đối tác rủi ro và khuyến nghị cân bằng tải
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
            title="Làm mới phân tích"
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
          <div className="inline-flex p-3 rounded-full bg-indigo-50 text-indigo-600 animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-gray-600">Hệ thống đang phân tích dữ liệu đối tác gara, kỹ thuật viên & rủi ro...</p>
        </div>
      )}

      {/* 3. Main Content */}
      {!loading && insight && isExpanded && (
        <div className="p-5 md:p-6 space-y-6">
          {/* Executive Summary & Score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
            <div className="md:col-span-3 bg-indigo-50/40 rounded-xl p-4 border border-indigo-100/60 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Tổng quan đánh giá mạng lưới đối tác
                </span>
                <p className="text-xs md:text-sm text-gray-800 leading-relaxed font-medium">
                  {insight.executiveSummary}
                </p>
              </div>
              <div className="mt-3 text-[11px] text-gray-600 flex items-center gap-2">
                <span>Cập nhật lúc: {new Date(insight.generatedAt).toLocaleTimeString('vi-VN')} {new Date(insight.generatedAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            {/* Health Score */}
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-4 border border-indigo-100 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Điểm Sức Khỏe Mạng Lưới
              </span>
              <div className="text-3xl md:text-4xl font-black text-indigo-600 my-1">
                {insight.healthScore}
                <span className="text-sm font-semibold text-gray-400">/100</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${health.color}`}>
                {health.label}
              </span>
            </div>
          </div>

          {/* Highlights & Bottlenecks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highlights */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Điểm sáng đối tác & thợ ({insight.highlights?.length || 0})
              </h4>
              <div className="space-y-2.5">
                {insight.highlights?.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-100/70 hover:bg-emerald-50 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-gray-900 text-xs">{item.title}</h5>
                      {item.metric && (
                        <span className="text-[11px] font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                          {item.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 leading-snug">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottlenecks / Risks */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Cảnh báo rủi ro & Vấn đề tồn đọng ({insight.bottlenecks?.length || 0})
              </h4>
              <div className="space-y-2.5">
                {insight.bottlenecks?.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-100/70 hover:bg-rose-50 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-gray-900 text-xs">{item.title}</h5>
                      {item.metric && (
                        <span className="text-[11px] font-extrabold text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200 shrink-0">
                          {item.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 leading-snug">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  Đề xuất hành động chiến lược đối tác ({filteredRecs.length})
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Các giải pháp cân bằng tải, kiểm soát rủi ro gara và khen thưởng kỹ thuật viên
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Tất cả ({recommendations.length})
                </button>
                <button
                  onClick={() => setActiveFilter('URGENT')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === 'URGENT' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-red-600'
                  }`}
                >
                  Khẩn cấp
                </button>
                <button
                  onClick={() => setActiveFilter('OPTIMIZATION')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === 'OPTIMIZATION' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-amber-600'
                  }`}
                >
                  Điều phối
                </button>
                <button
                  onClick={() => setActiveFilter('STRATEGIC')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === 'STRATEGIC' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-indigo-600'
                  }`}
                >
                  Chiến lược
                </button>
              </div>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {filteredRecs.map((rec: AiActionRecommendation) => {
                const cat = getCategoryBadge(rec.category);
                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-gray-200/80 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-1 mb-2.5">
                        {getPriorityBadge(rec.priority)}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                          {cat.label}
                        </span>
                      </div>

                      <h5 className="font-extrabold text-xs md:text-sm text-gray-900 mb-2 leading-tight">
                        {rec.title}
                      </h5>

                      <div className="space-y-2 text-[11px] mb-3">
                        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                          <span className="font-bold text-gray-600 block mb-0.5">Vấn đề phát hiện:</span>
                          <p className="text-gray-700 leading-relaxed">{rec.problemStatement}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100/70">
                          <span className="font-bold text-indigo-800 block mb-0.5">Giải pháp đề xuất:</span>
                          <p className="text-indigo-950 font-medium leading-relaxed">{rec.proposedAction}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className="text-gray-600 font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Kỳ vọng:
                      </span>
                      <span className="font-extrabold text-emerald-700 text-right">{rec.expectedImpact}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

