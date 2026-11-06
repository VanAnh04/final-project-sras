import React from 'react';
import { DollarSign, Percent, Store, Receipt, TrendingUp } from 'lucide-react';
import type { FinancialAnalyticsMetrics } from '../../types/analytics';

interface Props {
  metrics: FinancialAnalyticsMetrics;
}

export const FinancialKpiCards: React.FC<Props> = ({ metrics }) => {
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Tổng GMV */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tổng giá trị dịch vụ (GMV)</span>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl lg:text-3xl font-extrabold text-gray-900">{formatVnd(metrics.totalGmv)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">{metrics.completedOrderCount} ca cứu hộ thành công</p>
      </div>

      {/* 2. Doanh thu hoa hồng sàn SRAS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Doanh thu hoa hồng sàn</span>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Percent className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl lg:text-3xl font-extrabold text-orange-600">{formatVnd(metrics.totalCommission)}</span>
        </div>
        <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          Tỷ lệ hoa hồng thực tế: {metrics.effectiveCommissionRate}%
        </p>
      </div>

      {/* 3. Doanh thu đối tác Gara */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Doanh thu đối tác Gara</span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Store className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl lg:text-3xl font-extrabold text-gray-900">{formatVnd(metrics.garagePayout)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Tổng thu nhập chia sẻ cho hệ thống gara</p>
      </div>

      {/* 4. Giá trị đơn trung bình (AOV) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Giá trị đơn trung bình (AOV)</span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl lg:text-3xl font-extrabold text-gray-900">{formatVnd(metrics.avgOrderValue)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Mức chi trả trung bình trên 1 ca sự cố</p>
      </div>
    </div>
  );
};
