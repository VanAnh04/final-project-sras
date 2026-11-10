import { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Wrench, Car, Bike } from 'lucide-react';
import type { GarageRiskAlert, CapabilityDistribution } from '../../types/analytics';

interface Props {
  watchlist: GarageRiskAlert[];
  capabilities: CapabilityDistribution[];
}

export const PartnerRiskWatchlistCard = ({ watchlist, capabilities }: Props) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Danh sách Đối tác cần lưu tâm / Cảnh báo SLA */}
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
            watchlist.map((item) => (
              <div
                key={item.garageId}
                className="p-3 rounded-xl border border-red-100 bg-red-50/20 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    <AlertTriangle className={`w-4 h-4 ${item.severity === 'HIGH' ? 'text-red-600' : 'text-amber-500'}`} />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-gray-900 text-xs">{item.garageName}</h5>
                    <p className="text-[11px] text-red-600 font-semibold mt-0.5">{item.reason}</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                      <span>Đánh giá: <strong>{item.avgRating > 0 ? item.avgRating : '—'} ⭐</strong></span>
                      <span>Tỷ lệ hủy: <strong>{item.cancelRate}%</strong></span>
                      {item.openComplaints > 0 && <span>Khiếu nại: <strong className="text-red-600">{item.openComplaints} vụ</strong></span>}
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  item.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.severity === 'HIGH' ? 'Nghiêm trọng' : 'Cảnh báo'}
                </span>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-400 text-xs">
              Mạng lưới đối tác hoạt động ổn định, không có đối tác nào rơi vào diện cảnh báo SLA!
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
    </div>
  );
};
