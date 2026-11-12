import React from 'react';
import { Car, Bike, Wrench, Truck, Clock, Moon } from 'lucide-react';
import type { IncidentAnalyticsMetrics } from '../../types/analytics';

interface Props {
  metrics: IncidentAnalyticsMetrics;
}

export const IncidentOverviewCards: React.FC<Props> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Phân loại Ô tô vs Xe máy */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cơ cấu Phương tiện</span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Car className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-gray-900">{metrics.vehicleBreakdown.carCount} Ô tô</span>
          <span className="text-xs font-bold text-blue-600">({metrics.vehicleBreakdown.carPercentage}%)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 font-medium">
          <Bike className="w-3.5 h-3.5 text-gray-400" />
          <span>{metrics.vehicleBreakdown.motorbikeCount} Xe máy ({metrics.vehicleBreakdown.motorbikePercentage}%)</span>
        </div>
      </div>

      {/* 2. Sửa tại chỗ vs Kéo xe */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Hình thức Giải quyết</span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-gray-900">{metrics.resolutionBreakdown.onsiteCount} Tại chỗ</span>
          <span className="text-xs font-bold text-emerald-600">({metrics.resolutionBreakdown.onsitePercentage}%)</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 font-medium">
          <Truck className="w-3.5 h-3.5 text-gray-400" />
          <span>{metrics.resolutionBreakdown.towCount} Cẩu kéo về gara ({metrics.resolutionBreakdown.towPercentage}%)</span>
        </div>
      </div>

      {/* 3. Khung giờ cao điểm nhất */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Giờ cao điểm sự cố</span>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-orange-600">{metrics.peakHourLabel}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Đạt đỉnh với <span className="font-bold text-gray-700">{metrics.peakHourCount} ca cứu hộ</span> trong khung giờ
        </p>
      </div>

      {/* 4. Tỷ lệ cứu hộ ban đêm */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tỷ lệ Cứu hộ ban đêm</span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Moon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-gray-900">{metrics.nightIncidentRate}%</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Các sự cố phát sinh từ 22h00 đến 06h00 sáng</p>
      </div>
    </div>
  );
};
