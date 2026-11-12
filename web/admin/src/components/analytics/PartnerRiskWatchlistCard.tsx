import { useMemo, useState } from 'react';
import { ShieldAlert, AlertTriangle, Wrench, Car, Bike, Send, Check, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { GarageRiskAlert, CapabilityDistribution } from '../../types/analytics';
import { analyticsApi } from '../../api/analyticsApi';

interface Props {
  watchlist: GarageRiskAlert[];
  capabilities: CapabilityDistribution[];
}

export const PartnerRiskWatchlistCard = ({ watchlist, capabilities }: Props) => {
  const [sentGarages, setSentGarages] = useState<Record<number, boolean>>({});
  const [modalAlert, setModalAlert] = useState<GarageRiskAlert | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalBody, setModalBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenModal = (item: GarageRiskAlert) => {
    setModalAlert(item);
    setModalTitle(`[Cảnh báo chất lượng đối tác] Yêu cầu khắc phục tại ${item.garageName}`);
    const details: string[] = [];
    if (item.cancelRate > 0) details.push(`tỷ lệ hủy đơn ở mức ${item.cancelRate}%`);
    if (item.avgRating > 0 && item.avgRating < 4.0) details.push(`điểm đánh giá trung bình chỉ đạt ${item.avgRating} sao`);
    if (item.openComplaints > 0) details.push(`còn ${item.openComplaints} khiếu nại chưa giải quyết`);
    const summaryStr = details.length > 0 ? details.join(', ') : item.reason;
    setModalBody(
      `Hệ thống ghi nhận đối tác ${item.garageName} đang nằm trong danh sách cảnh báo rủi ro (${item.reason}: ${summaryStr}). Đề nghị Quý gara kiểm tra ngay quy trình phục vụ, nâng cao chất lượng hỗ trợ khách hàng và xử lý dứt điểm các tồn đọng để duy trì quyền nhận đơn trên hệ thống.`
    );
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
      setSentGarages((prev) => ({ ...prev, [modalAlert.garageId]: true }));
      showToast(`Đã gửi cảnh báo tới Chủ gara "${modalAlert.garageName}" thành công!`, 'success');
      setModalAlert(null);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi gửi thông báo';
      showToast(errMsg, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const normalizedCapabilities = useMemo(() => {
    const list: CapabilityDistribution[] = [
      { capability: 'BOTH', label: 'Cả Ô tô & Xe máy', count: 0, percentage: 0 },
      { capability: 'CAR', label: 'Chỉ Ô tô', count: 0, percentage: 0 },
      { capability: 'MOTORBIKE', label: 'Chỉ Xe máy', count: 0, percentage: 0 },
    ];
    return list.map((item) => {
      const found = capabilities?.find(
        (c) => c.capability.toUpperCase() === item.capability ||
               (item.capability === 'CAR' && c.capability.toUpperCase().includes('CAR')) ||
               (item.capability === 'MOTORBIKE' && c.capability.toUpperCase().includes('MOTOR')) ||
               (item.capability === 'BOTH' && (c.capability.toUpperCase() === 'BOTH' || c.capability.toUpperCase().includes('ALL')))
      );
      if (found) {
        return {
          ...item,
          count: found.count,
          percentage: found.percentage,
        };
      }
      return item;
    });
  }, [capabilities]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
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

      {/* 1. Danh sách Đối tác cần lưu tâm / Cảnh báo vận hành */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
        <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Cảnh Báo Rủi Ro Đối Tác (Watchlist)</h4>
            <p className="text-xs text-gray-400">Các gara có tỷ lệ hủy cao, đánh giá thấp hoặc khiếu nại tồn đọng</p>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[280px] pr-1">
          {watchlist.length > 0 ? (
            watchlist.map((item) => {
              const isSent = sentGarages[item.garageId];
              return (
                <div
                  key={item.garageId}
                  className="p-3 rounded-xl border border-red-100 bg-red-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      <AlertTriangle className={`w-4 h-4 ${item.severity === 'HIGH' ? 'text-red-600' : 'text-amber-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-gray-900 text-xs">{item.garageName}</h5>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.severity === 'HIGH' ? 'Nghiêm trọng' : 'Cảnh báo'}
                        </span>
                      </div>
                      <p className="text-[11px] text-red-600 font-semibold mt-0.5">{item.reason}</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                        <span>Đánh giá: <strong>{item.avgRating > 0 ? item.avgRating : '—'} ⭐</strong></span>
                        <span>Tỷ lệ hủy: <strong>{item.cancelRate}%</strong></span>
                        {item.openComplaints > 0 && <span>Khiếu nại: <strong className="text-red-600">{item.openComplaints} vụ</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end shrink-0">
                    {isSent ? (
                      <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Đã gửi
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenModal(item)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        Gửi thông báo
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-gray-400 text-xs">
              Mạng lưới đối tác hoạt động ổn định, không có đối tác nào rơi vào diện cảnh báo rủi ro!
            </div>
          )}
        </div>
      </div>

      {/* 2. Cơ cấu Năng lực Phục vụ Cứu hộ (Capability Breakdown) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 mb-4">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Cơ Cấu Năng Lực Phục Vụ Đối Tác</h4>
              <p className="text-xs text-gray-400">Phân bổ chuyên môn cứu hộ ô tô, xe máy trong mạng lưới</p>
            </div>
          </div>

          <div className="space-y-4">
            {normalizedCapabilities.map((cap) => {
              const isCar = cap.capability === 'CAR';
              const isBike = cap.capability === 'MOTORBIKE';
              const barColor = isCar ? 'bg-blue-500' : isBike ? 'bg-orange-500' : 'bg-amber-500';

              return (
                <div key={cap.capability} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center gap-1.5">
                      {isCar ? <Car className="w-3.5 h-3.5 text-blue-500" /> : isBike ? <Bike className="w-3.5 h-3.5 text-orange-500" /> : <Wrench className="w-3.5 h-3.5 text-amber-500" />}
                      {cap.label}
                    </span>
                    <span className="font-black text-gray-900">{cap.count} Gara ({cap.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${cap.percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 p-3 bg-orange-50/50 rounded-xl border border-orange-100 text-[11px] text-orange-800 leading-relaxed">
          💡 <strong>Khuyến nghị mạng lưới:</strong> Khuyến khích các gara mở rộng năng lực phục vụ cứu hộ cả Ô tô và Xe máy để tối ưu hóa tỷ lệ ghép cuốc tự động (Dispatching) trên hệ thống.
        </div>
      </div>

      {/* Modal gửi thông báo */}
      {modalAlert && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 text-sm">Gửi Thông Báo Khắc Phục</h4>
                  <p className="text-[11px] text-gray-400">Gửi trực tiếp tới tài khoản Chủ gara</p>
                </div>
              </div>
              <button
                onClick={() => !isSending && setModalAlert(null)}
                disabled={isSending}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-gray-900 block">{modalAlert.garageName}</span>
                <span className="text-[11px] text-red-600 font-semibold">{modalAlert.reason}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                modalAlert.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {modalAlert.severity === 'HIGH' ? 'Nghiêm trọng' : 'Cảnh báo'}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  disabled={isSending}
                  className="w-full text-xs font-semibold px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nội dung đề xuất khắc phục</label>
                <textarea
                  rows={4}
                  value={modalBody}
                  onChange={(e) => setModalBody(e.target.value)}
                  disabled={isSending}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => !isSending && setModalAlert(null)}
                disabled={isSending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
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
                    Đang gửi...
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
