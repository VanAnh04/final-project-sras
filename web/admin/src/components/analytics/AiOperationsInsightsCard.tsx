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
  Zap, 
  Building2,
  Phone,
  MapPin,
  Send,
  Check,
  X,
  MessageSquareWarning,
  AlertCircle
} from 'lucide-react';
import type { AiAnalyticsInsight, GarageActionAlert } from '../../types/analytics';
import { analyticsApi } from '../../api/analyticsApi';

interface Props {
  insight: AiAnalyticsInsight | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AiOperationsInsightsCard: React.FC<Props> = ({ insight, loading, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HIGH_CANCELLATION' | 'LATE_ARRIVAL' | 'BOTH'>('ALL');
  
  // Trạng thái lưu gara đã gửi thông báo thành công
  const [sentGarages, setSentGarages] = useState<Record<number, boolean>>({});
  
  // Trạng thái modal gửi thông báo
  const [modalAlert, setModalAlert] = useState<GarageActionAlert | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalBody, setModalBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOpenModal = (alert: GarageActionAlert) => {
    setModalAlert(alert);
    setModalTitle(alert.aiDraftNotificationTitle || `[Cảnh báo vận hành] Nhắc nhở hiệu suất tại ${alert.garageName}`);
    setModalBody(alert.aiDraftNotificationBody || '');
  };

  const handleCloseModal = () => {
    if (isSending) return;
    setModalAlert(null);
  };

  const handleConfirmSend = async () => {
    if (!modalAlert) return;
    if (!modalTitle.trim() || !modalBody.trim()) {
      showToast('Vui lòng không để trống tiêu đề hoặc nội dung thông báo', 'error');
      return;
    }

    try {
      setIsSending(true);
      await analyticsApi.sendGarageWarning(modalAlert.garageId, modalTitle.trim(), modalBody.trim());
      setSentGarages(prev => ({ ...prev, [modalAlert.garageId]: true }));
      showToast(`Đã gửi thông báo cảnh báo tới Chủ gara "${modalAlert.garageName}" thành công!`, 'success');
      setModalAlert(null);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi gửi thông báo';
      showToast(errMsg, 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (!insight && !loading) {
    return (
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 border border-orange-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-200">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
              Đề Xuất & Tối Ưu Vận Hành
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Chưa có dữ liệu phân tích vận hành cho chu kỳ này. Nhấn nút bên cạnh để phân tích dữ liệu.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-orange-200 transition-all hover:scale-[1.02] active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          ✨ Phân Tích Dữ Liệu
        </button>
      </div>
    );
  }

  // Danh sách gara cần cảnh báo
  const garageAlerts = insight?.garageActionAlerts || [];
  const filteredAlerts = garageAlerts.filter((item) => {
    if (activeFilter === 'ALL') return true;
    return item.issueType === activeFilter;
  });

  const getIssueBadge = (type: string) => {
    switch (type) {
      case 'BOTH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Hủy cao & Đi trễ
          </span>
        );
      case 'HIGH_CANCELLATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-orange-50 text-orange-700 border border-orange-200">
            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
            Tỷ lệ hủy đơn cao
          </span>
        );
      case 'LATE_ARRIVAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Tiếp cận hiện trường trễ
          </span>
        );
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
        return { label: 'Xuất sắc', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'STABLE':
        return { label: 'Ổn định', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'WARNING':
        return { label: 'Cần chú ý', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'CRITICAL':
      default:
        return { label: 'Báo động', color: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  const health = getHealthBadge(insight?.overallHealthStatus || 'STABLE');

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden transition-all relative">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border bg-gray-900 text-white text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-300">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Header Card */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/10 p-5 border-b border-orange-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-orange-200">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900 text-sm md:text-base">
                Đề Xuất & Tối Ưu Vận Hành
              </h3>
              {insight?.fromCache && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                  Từ bộ nhớ đệm
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Phát hiện vấn đề phễu cứu hộ, khoảng cách điều phối và khuyến nghị tối ưu tốc độ phản hồi tự động
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
          <p className="text-xs font-bold text-gray-600">Hệ thống đang phân tích toàn bộ phễu vận hành & tốc độ phản hồi...</p>
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
                Điểm Sức Khỏe Vận Hành
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
                <Zap className="w-3.5 h-3.5 fill-orange-500" />
                Tóm Tắt Điều Hành
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
                Điểm Sáng Vận Hành
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
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30">
              <h5 className="font-bold text-xs text-amber-800 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Vấn Đề Cần Lưu Ý
              </h5>
              <div className="space-y-2.5">
                {insight.bottlenecks?.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-amber-100/60 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-xs">{item.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700">
                        {item.metric}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Danh sách các Gara vi phạm & Nút gửi thông báo chấn chỉnh */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-600" />
                  Đề Xuất Hành Động: Cảnh Báo Gara Vi Phạm Vận Hành
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    garageAlerts.length > 0 ? 'bg-orange-100 text-orange-800' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {garageAlerts.length} gara cần lưu tâm
                  </span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Danh sách đối tác có tỷ lệ hủy đơn cao hoặc tiếp cận hiện trường trễ. Bấm gửi thông báo để nhắc nhở trực tiếp tới chủ gara với nội dung soạn sẵn theo số liệu thực tế.
                </p>
              </div>

              {/* Filter Tabs */}
              {garageAlerts.length > 0 && (
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setActiveFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Tất cả ({garageAlerts.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('HIGH_CANCELLATION')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeFilter === 'HIGH_CANCELLATION' ? 'bg-orange-50 text-orange-700 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Hủy đơn cao
                  </button>
                  <button
                    onClick={() => setActiveFilter('LATE_ARRIVAL')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeFilter === 'LATE_ARRIVAL' ? 'bg-amber-50 text-amber-700 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Tiếp cận trễ
                  </button>
                  <button
                    onClick={() => setActiveFilter('BOTH')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      activeFilter === 'BOTH' ? 'bg-red-50 text-red-700 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Cả hai
                  </button>
                </div>
              )}
            </div>

            {/* List Gara hoặc Empty State */}
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-orange-50/30 border border-orange-100 space-y-2">
                <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700 mb-1">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h5 className="font-bold text-gray-900 text-xs">Mạng lưới gara vận hành đạt chuẩn</h5>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Không ghi nhận gara nào có tỷ lệ hủy đơn cao hoặc tiếp cận hiện trường trễ trong chu kỳ này. Hệ thống vận hành trơn tru và đảm bảo tốc độ phản hồi cam kết.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const isSent = alert.notificationSent || sentGarages[alert.garageId];

                  return (
                    <div
                      key={alert.garageId}
                      className="bg-white p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                    >
                      {/* Cột trái: Thông tin Gara & Tình trạng vi phạm */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-gray-900 text-xs md:text-sm flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-orange-600" />
                            {alert.garageName}
                          </span>
                          {getIssueBadge(alert.issueType)}
                          <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
                            {alert.issueSummary}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                          {alert.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              {alert.phone}
                            </span>
                          )}
                          {alert.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span className="line-clamp-1">{alert.address}</span>
                            </span>
                          )}
                          {alert.cancelledJobs > 0 && (
                            <span className="font-medium text-orange-700">
                              Đã hủy: <strong>{alert.cancelledJobs} ca</strong> ({alert.cancelRate}%)
                            </span>
                          )}
                          {alert.avgArrivalMinutes > 0 && (
                            <span className="font-medium text-amber-700">
                              Thời gian đến: <strong>{alert.avgArrivalMinutes} phút</strong>
                            </span>
                          )}
                        </div>

                        {/* Hộp xem trước nội dung soạn sẵn */}
                        <div className="bg-orange-50/40 p-2.5 rounded-lg border border-orange-100/80 text-[11px]">
                          <div className="font-bold text-orange-950 mb-0.5 flex items-center gap-1">
                            <MessageSquareWarning className="w-3.5 h-3.5 text-orange-600" />
                            Nội dung soạn sẵn gửi Chủ gara:
                          </div>
                          <p className="text-gray-600 font-medium leading-relaxed italic">
                            "{alert.aiDraftNotificationBody}"
                          </p>
                        </div>
                      </div>

                      {/* Cột phải: Nút Gửi thông báo */}
                      <div className="flex items-center gap-2 w-full lg:w-auto justify-end shrink-0">
                        {isSent ? (
                          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                            <Check className="w-3.5 h-3.5" />
                            Đã gửi cảnh báo
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenModal(alert)}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-orange-200 transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Gửi thông báo
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN & TÙY CHỈNH THÔNG BÁO */}
      {modalAlert && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">Gửi Thông Báo Cảnh Báo</h4>
                  <p className="text-[11px] text-gray-400">Gửi trực tiếp tới tài khoản Chủ gara</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={isSending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Garage Info Mini Card */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-gray-900 block">{modalAlert.garageName}</span>
                <span className="text-[11px] text-gray-500">{modalAlert.phone} • {modalAlert.address}</span>
              </div>
              <div>
                {getIssueBadge(modalAlert.issueType)}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tiêu đề thông báo
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  disabled={isSending}
                  className="w-full text-xs font-semibold px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="Nhập tiêu đề thông báo..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Nội dung thông báo</span>
                  <span className="text-[10px] text-orange-600 font-normal">Đã soạn sẵn theo tình trạng vi phạm</span>
                </label>
                <textarea
                  rows={4}
                  value={modalBody}
                  onChange={(e) => setModalBody(e.target.value)}
                  disabled={isSending}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all leading-relaxed"
                  placeholder="Nhập nội dung cảnh báo..."
                />
              </div>

              <div className="text-[11px] text-gray-500 bg-orange-50/50 p-2.5 rounded-xl border border-orange-100/60 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span>
                  Thông báo sẽ được gửi vào hộp thư hệ thống của chủ gara kèm thông báo đẩy (push notification) trên ứng dụng di động.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleCloseModal}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSend}
                disabled={isSending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-orange-200 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang gửi thông báo...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Xác nhận gửi thông báo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
