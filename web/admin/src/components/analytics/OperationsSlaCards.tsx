import React from 'react';
import { CheckCircle2, Clock, Wrench, AlertOctagon, TrendingUp, TrendingDown, Navigation } from 'lucide-react';
import type { RescueOperationsMetrics } from '../../types/analytics';

interface Props {
  metrics: RescueOperationsMetrics;
}

export const OperationsSlaCards: React.FC<Props> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Tỷ lệ cứu hộ thành công */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tỷ lệ thành công</span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gray-900">{metrics.successRate}%</span>
          <span className="text-xs font-bold text-emerald-600 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
            {metrics.completedRequests}/{metrics.totalRequests} ca
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Tổng số ca hoàn thành / tiếp nhận</p>
      </div>

      {/* 2. Thời gian tiếp cận (SLA di chuyển) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Thời gian tiếp cận hiện trường</span>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gray-900">{metrics.avgArrivalMinutes}</span>
          <span className="text-sm font-bold text-gray-500">phút</span>
          <span className="text-xs text-orange-600 font-semibold ml-auto flex items-center gap-1">
            <Navigation className="w-3 h-3" /> ~{metrics.avgDispatchDistanceKm} km
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Tính từ lúc thợ xuất phát đến hiện trường</p>
      </div>

      {/* 3. Thời gian xử lý cứu hộ */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Thời gian sửa chữa / cứu hộ</span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gray-900">{metrics.avgHandlingMinutes}</span>
          <span className="text-sm font-bold text-gray-500">phút</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Thời gian trung bình xử lý tại chỗ hoặc cẩu kéo</p>
      </div>

      {/* 4. Tỷ lệ hủy ca */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className={`absolute top-0 left-0 w-1.5 h-full ${metrics.cancellationRate > 15 ? 'bg-red-500' : 'bg-amber-500'}`}></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tỷ lệ hủy ca</span>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
            metrics.cancellationRate > 15 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
          }`}>
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gray-900">{metrics.cancellationRate}%</span>
          <span className={`text-xs font-bold flex items-center ${metrics.cancellationRate > 15 ? 'text-red-500' : 'text-amber-600'}`}>
            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
            {metrics.cancelledRequests} ca hủy
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Bao gồm khách hủy, gara từ chối & timeout</p>
      </div>
    </div>
  );
};
