import React from 'react';
import { MapPin } from 'lucide-react';
import type { HotspotStat } from '../../types/analytics';

interface Props {
  topHotspots: HotspotStat[];
}

export const IncidentHotspotsList: React.FC<Props> = ({ topHotspots }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base">Điểm nóng Sự cố</h3>
          <p className="text-xs text-gray-500">Các tuyến đường & khu vực có tần suất yêu cầu cứu hộ cao nhất</p>
        </div>
      </div>

      <div className="space-y-3 my-auto">
        {topHotspots && topHotspots.length > 0 ? (
          topHotspots.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between hover:bg-orange-50/40 hover:border-orange-100 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 ${
                  idx === 0 
                    ? 'bg-red-500 text-white' 
                    : idx === 1 
                    ? 'bg-orange-500 text-white' 
                    : idx === 2 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-gray-800 truncate" title={item.address}>
                  {item.address}
                </span>
              </div>
              <span className="text-xs font-black text-gray-900 bg-white px-2.5 py-1 rounded-lg border border-gray-200 flex-shrink-0 shadow-2xs">
                {item.count} ca
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 py-8 text-center">Chưa có dữ liệu địa chỉ chi tiết.</p>
        )}
      </div>
    </div>
  );
};
