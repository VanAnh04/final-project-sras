import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  MapPin,
  HelpCircle,
  Calculator,
  X
} from 'lucide-react';
import type { AiAnalyticsInsight } from '../../types/analytics';

interface Props {
  insight: AiAnalyticsInsight | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AiIncidentInsightsCard: React.FC<Props> = ({ insight, loading, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  if (!insight && !loading) {
    return (
      <div className="bg-gradient-to-r from-orange-900/5 via-amber-900/5 to-rose-900/5 border border-orange-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-orange-200">
            <MapPin className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
              Phân Tích Điểm Nóng Sự Cố & Mật Độ Khu Vực
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Chưa có dữ liệu phân tích sự cố cho chu kỳ này. Nhấn nút bên cạnh để phân tích dữ liệu.
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
                Phân Tích Điểm Nóng Sự Cố & Mật Độ Khu Vực
              </h3>
              {insight?.fromCache && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                  Từ bộ nhớ đệm
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Phát hiện cụm sự cố theo giờ cao điểm, mật độ ca đêm và đánh giá khả năng phản ứng theo khu vực
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
          <p className="text-xs font-bold text-gray-600">Hệ thống đang phân tích dữ liệu bản đồ nhiệt & mật độ điểm nóng sự cố...</p>
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

              {/* Nút Xem chi tiết tính điểm */}
              <button
                type="button"
                onClick={() => setShowDetailModal(true)}
                className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700 border border-orange-200/60 transition-colors cursor-pointer"
                title="Bấm để xem chi tiết cách tính điểm sẵn sàng ứng cứu"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Xem chi tiết
              </button>
            </div>

            {/* Executive Summary */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 mb-1">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                Nhận Định Mật Độ Giao Thông & Sự Cố
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
        </div>
      )}

      {/* MODAL CHI TIẾT TÍNH ĐIỂM SẴN SÀNG ỨNG CỨU */}
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
                  <h4 className="font-extrabold text-gray-900 text-sm">Chi Tiết Tính Điểm Sẵn Sàng Ứng Cứu</h4>
                  <p className="text-[11px] text-gray-400">Đo lường năng lực bao phủ và mức độ đáp ứng cứu hộ tại các điểm nóng</p>
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
                Điểm Sẵn Sàng = Điểm cơ sở (85đ) - Phạt ca đêm - Phạt dồn tải giờ cao điểm
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-2.5 text-xs">
              {/* Thành phần 1 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-orange-500 text-white text-[10px] flex items-center justify-center font-black">1</span>
                    Điểm Cơ Sở Vùng Phủ Tiêu Chuẩn
                  </span>
                  <span className="text-orange-600 font-extrabold">85 điểm chuẩn</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Hệ thống thiết lập mức tiêu chuẩn ban đầu là <strong>85 điểm</strong> dựa trên mật độ phân bổ các đội cứu hộ và gara đối tác liên kết sẵn sàng tiếp nhận sự cố trên toàn địa bàn.
                </p>
              </div>

              {/* Thành phần 2 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-amber-500 text-white text-[10px] flex items-center justify-center font-black">2</span>
                    Mức Độ Khó Khăn Ca Đêm (22h - 06h)
                  </span>
                  <span className="text-amber-600 font-extrabold">Trừ tối đa 20 điểm</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Lấy <strong>Tỷ lệ sự cố ban đêm (%) × 0.4</strong> để trừ điểm. Ban đêm số lượng gara trực giảm mạnh, tỷ lệ ca đêm càng cao thì rủi ro thiếu thợ ứng cứu tại hiện trường càng lớn.
                </p>
              </div>

              {/* Thành phần 3 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-orange-600 text-white text-[10px] flex items-center justify-center font-black">3</span>
                    Áp Lực Dồn Tải Giờ Cao Điểm
                  </span>
                  <span className="text-orange-700 font-extrabold">Trừ tối đa 10 điểm</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Nếu số ca phát sinh dồn cục trong 1 khung giờ cao điểm vượt ngưỡng quy định (&gt; 10 ca/giờ), hệ thống sẽ trừ 10 điểm do nguy cơ quá tải cục bộ tại các điểm nóng giao thông.
                </p>
              </div>

              {/* Thang phân loại */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <span className="font-bold text-gray-900 block text-[11px]">Thang Phân Loại Sẵn Sàng Ứng Cứu:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ≥ 80 điểm<br /><span className="font-normal">Vùng phủ Tốt</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    65 - 79.9 điểm<br /><span className="font-normal">Ổn định</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                    45 - 64.9 điểm<br /><span className="font-normal">Cần chú ý</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    &lt; 45 điểm<br /><span className="font-normal">Quá tải cục bộ</span>
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

