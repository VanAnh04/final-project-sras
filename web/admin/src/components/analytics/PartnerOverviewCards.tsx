import { Building2, Users, CheckCircle2, Star, Radio } from 'lucide-react';
import type { PartnerAnalyticsMetrics } from '../../types/analytics';

interface Props {
  metrics: PartnerAnalyticsMetrics;
}

export const PartnerOverviewCards = ({ metrics }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Mạng lưới Gara Đối tác */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mạng lưới Gara</span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-gray-900">{metrics.activeGarages} Hoạt động</span>
          <span className="text-xs font-bold text-gray-400">/ {metrics.totalGarages} tổng</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-2 font-medium">
          <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
          <span>{metrics.onlineGarages} gara đang online sẵn sàng nhận đơn</span>
        </div>
      </div>

      {/* 2. Đội ngũ Kỹ thuật viên */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Đội ngũ Kỹ thuật viên</span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-gray-900">{metrics.activeTechnicians} Nhân sự</span>
          <span className="text-xs font-bold text-gray-400">/ {metrics.totalTechnicians} đã duyệt</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 font-medium">
          <span>Lực lượng trực tiếp ứng cứu hiện trường</span>
        </div>
      </div>

      {/* 3. Tỷ lệ hoàn thành ca của Mạng lưới */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tỷ lệ Hoàn thành ca</span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-600">{metrics.networkFulfillmentRate}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 font-medium">
          <span>Đơn cứu hộ bàn giao thành công</span>
        </div>
      </div>

      {/* 4. Đánh giá chất lượng toàn mạng lưới */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Đánh giá Sao trung bình</span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-gray-900">{metrics.avgNetworkRating}</span>
          <span className="text-xs font-bold text-amber-500">/ 5.0 ⭐</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2 font-medium">
          <span>Mức độ hài lòng của khách hàng</span>
        </div>
      </div>
    </div>
  );
};
