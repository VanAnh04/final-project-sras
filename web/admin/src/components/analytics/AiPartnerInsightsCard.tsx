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
  Clock,
  HelpCircle,
  Calculator,
  X
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
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  if (!insight && !loading) {
    return (
      <div className="bg-gradient-to-r from-orange-900/5 via-amber-900/5 to-rose-900/5 border border-orange-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-200">
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
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-orange-200 transition-all hover:scale-[1.02] active:scale-95"
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-orange-50 text-orange-700 border border-orange-200">
            <Award className="w-3.5 h-3.5 text-orange-600" />
            Chiến lược mạng lưới (P3)
          </span>
        );
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
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden transition-all">
      {/* 1. Header Card */}
      <div className="bg-gradient-to-r from-orange-900/5 via-amber-900/5 to-rose-900/5 p-5 border-b border-orange-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-orange-200">
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
            className="p-2 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
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
          <div className="inline-flex p-3 rounded-full bg-orange-50 text-orange-600 animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-gray-600">Hệ thống đang phân tích dữ liệu đối tác gara, kỹ thuật viên & rủi ro...</p>
        </div>
      )}

      {/* 3. Main Content Body */}
      {!loading && insight && isExpanded && (
        <div className="p-5 space-y-6">
          {/* Row 1: Executive Summary & Health Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
            {/* Health Score */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200/80 pb-4 lg:pb-0 lg:pr-4">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Điểm Sức Khỏe Mạng Lưới
              </span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-3xl font-black text-gray-900">{insight.healthScore}</span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${health.color}`}>
                {health.label}
              </span>

              {/* Nút Xem chi tiết tính điểm */}
              <button
                type="button"
                onClick={() => setShowDetailModal(true)}
                className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 border border-orange-200/60 transition-colors cursor-pointer"
                title="Bấm để xem chi tiết cách tính điểm sức khỏe mạng lưới"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Xem chi tiết
              </button>
            </div>

            {/* Executive Summary */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 mb-1">
                <Building2 className="w-3.5 h-3.5 text-orange-600" />
                Tổng Quan Đánh Giá Mạng Lưới Đối Tác
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
                Điểm Sáng Đối Tác & Thợ ({insight.highlights?.length || 0})
              </h5>
              <div className="space-y-2.5">
                {insight.highlights?.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-emerald-100/60 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-xs">{item.title}</span>
                      {item.metric && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700">
                          {item.metric}
                        </span>
                      )}
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
                Cảnh Báo Rủi Ro & Vấn Đề Tồn Đọng ({insight.bottlenecks?.length || 0})
              </h5>
              <div className="space-y-2.5">
                {insight.bottlenecks?.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-rose-100/60 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-xs">{item.title}</span>
                      {item.metric && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700">
                          {item.metric}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Action Recommendations */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-600" />
                  Đề Xuất Hành Động Chiến Lược Đối Tác
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-600">
                    {recommendations.length} đề xuất
                  </span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Các giải pháp cân bằng tải, kiểm soát rủi ro gara và khen thưởng kỹ thuật viên
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

      {/* MODAL CHI TIẾT TÍNH ĐIỂM SỨC KHỎE MẠNG LƯỚI */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">Chi Tiết Tính Điểm Sức Khỏe Mạng Lưới</h4>
                  <p className="text-[11px] text-gray-400">Đo lường năng lực phục vụ, chất lượng đánh giá và tỷ lệ hoàn thành của đối tác</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rule Box */}
            <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-800 block mb-1">
                Quy tắc tính:
              </span>
              <div className="font-mono text-xs md:text-sm font-black text-orange-950 bg-white px-3 py-2.5 rounded-lg border border-orange-200 shadow-2xs">
                Điểm Mạng Lưới = Điểm cơ sở (80đ) ± Điểm hoàn thành ± Điểm đánh giá - Phạt rủi ro
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-2.5 text-xs">
              {/* Thành phần 1 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-orange-500 text-white text-[10px] flex items-center justify-center font-black">1</span>
                    Tỷ Lệ Hoàn Thành Cuốc Toàn Mạng
                  </span>
                  <span className="text-orange-600 font-extrabold">±15 điểm</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Đo lường tỷ lệ các đơn cứu hộ được gara đối tác tiếp nhận và xử lý thành công:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-2 rounded-lg border border-gray-200">
                    <span className="font-bold text-emerald-700 block">≥ 80%</span>
                    <span className="text-gray-500 font-medium">+10 điểm (Mạng lưới vững)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-gray-200">
                    <span className="font-bold text-rose-700 block">&lt; 60%</span>
                    <span className="text-gray-500 font-medium">-15 điểm (Thiếu đối tác)</span>
                  </div>
                </div>
              </div>

              {/* Thành phần 2 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">2</span>
                    Điểm Đánh Giá Sao Trung Bình
                  </span>
                  <span className="text-amber-600 font-extrabold">±10 điểm</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Đánh giá mức độ hài lòng của khách hàng đối với chất lượng phục vụ của thợ và gara:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-2 rounded-lg border border-gray-200">
                    <span className="font-bold text-emerald-700 block">≥ 4.5 ⭐</span>
                    <span className="text-gray-500 font-medium">+5 điểm (Rất tốt)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-gray-200">
                    <span className="font-bold text-amber-700 block">&lt; 4.0 ⭐</span>
                    <span className="text-gray-500 font-medium">-10 điểm (Cần cải thiện)</span>
                  </div>
                </div>
              </div>

              {/* Thành phần 3 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-orange-600 text-white text-[10px] flex items-center justify-center font-black">3</span>
                    Kiểm Soát Gara Trong Danh Sách Rủi Ro
                  </span>
                  <span className="text-orange-700 font-extrabold">Trừ tối đa 15 điểm</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Hệ thống trừ 5 điểm cho mỗi gara có tỷ lệ hủy đơn cao (&gt; 15%) hoặc có khiếu nại chưa xử lý để phản ánh rủi ro đối tác.
                </p>
              </div>

              {/* Thang phân loại */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <span className="font-bold text-gray-900 block text-[11px]">Thang Phân Loại Sức Khỏe Mạng Lưới:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ≥ 80 điểm<br /><span className="font-normal">Vững mạnh</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    65 - 79.9 điểm<br /><span className="font-normal">Ổn định</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                    45 - 64.9 điểm<br /><span className="font-normal">Cảnh báo</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    &lt; 45 điểm<br /><span className="font-normal">Rủi ro cao</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
