import { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Star, 
  Clock, 
  AlertTriangle, 
  Trophy, 
  Award, 
  ShieldCheck, 
  ShieldAlert,
  Car,
  Bike
} from 'lucide-react';
import type { GaragePerformanceStat } from '../../types/analytics';

interface Props {
  garages: GaragePerformanceStat[];
}

export const TopGaragesTable = ({ garages }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('ALL');
  const [badgeFilter, setBadgeFilter] = useState<string>('ALL');

  const filteredGarages = useMemo(() => {
    return garages.filter(g => {
      const matchSearch = g.garageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.phone.includes(searchTerm) ||
        g.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCap = capabilityFilter === 'ALL' || g.capability === capabilityFilter;
      const matchBadge = badgeFilter === 'ALL' || g.healthBadge === badgeFilter;

      return matchSearch && matchCap && matchBadge;
    });
  }, [garages, searchTerm, capabilityFilter, badgeFilter]);

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center border border-amber-300 shadow-xs">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-300 shadow-xs">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center border border-orange-300 shadow-xs">
          🥉 3
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-full bg-gray-50 text-gray-500 font-bold text-xs flex items-center justify-center border border-gray-200">
        #{rank}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* 1. Header & Filters */}
      <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Bảng Xếp Hạng Đối Tác Gara</h3>
            <p className="text-xs text-gray-500">
              Đánh giá hiệu suất cứu hộ, doanh thu, thời gian tiếp cận và chỉ số uy tín của từng đối tác
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Ô tìm kiếm */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên gara, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 w-44 lg:w-52"
            />
          </div>

          {/* Lọc Năng lực */}
          <select
            value={capabilityFilter}
            onChange={(e) => setCapabilityFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-medium text-gray-700 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="ALL">Tất cả phương tiện</option>
            <option value="CAR">Chuyên Ô tô</option>
            <option value="MOTORBIKE">Chuyên Xe máy</option>
            <option value="BOTH">Cả Ô tô & Xe máy</option>
          </select>

          {/* Lọc Trạng thái sức khỏe */}
          <select
            value={badgeFilter}
            onChange={(e) => setBadgeFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-medium text-gray-700 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="ALL">Tất cả xếp hạng</option>
            <option value="EXCELLENT">🏆 Top Xuất sắc</option>
            <option value="GOOD">⭐ Hoạt động Tốt</option>
            <option value="WARNING">⚠️ Cần cải thiện</option>
          </select>
        </div>
      </div>

      {/* 2. Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4 w-14 text-center">Hạng</th>
              <th className="py-3.5 px-4">Đối tác Gara</th>
              <th className="py-3.5 px-4 text-center">Năng lực</th>
              <th className="py-3.5 px-4 text-right">Tổng ca / Hoàn thành</th>
              <th className="py-3.5 px-4 text-right">Doanh số (GMV)</th>
              <th className="py-3.5 px-4 text-right">Hoa hồng sàn</th>
              <th className="py-3.5 px-4 text-center">Tiếp cận (SLA)</th>
              <th className="py-3.5 px-4 text-center">Đánh giá</th>
              <th className="py-3.5 px-4 text-center">Khiếu nại</th>
              <th className="py-3.5 px-4 text-center">Xếp loại</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {filteredGarages.length > 0 ? (
              filteredGarages.map((garage) => (
                <tr key={garage.garageId} className="hover:bg-orange-50/30 transition-colors group">
                  {/* Cột Thứ hạng */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center">
                      {getRankBadge(garage.rank)}
                    </div>
                  </td>

                  {/* Cột Tên Gara & Địa chỉ */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${garage.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`} title={garage.isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}></span>
                      <span className="font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors">
                        {garage.garageName}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 max-w-xs">
                      {garage.address} • <span className="font-medium text-gray-500">{garage.phone}</span>
                    </div>
                  </td>

                  {/* Cột Năng lực */}
                  <td className="py-3.5 px-4 text-center">
                    {garage.capability === 'CAR' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                        <Car className="w-3 h-3" /> Ô tô
                      </span>
                    ) : garage.capability === 'MOTORBIKE' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-bold text-[10px]">
                        <Bike className="w-3 h-3" /> Xe máy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
                        Cả hai
                      </span>
                    )}
                  </td>

                  {/* Cột Số ca & Tỷ lệ */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-bold text-gray-900">
                      {garage.completedJobs} / {garage.totalAssigned} ca
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            garage.completionRate >= 80 ? 'bg-emerald-500' : garage.completionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(garage.completionRate, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">{garage.completionRate}%</span>
                    </div>
                  </td>

                  {/* Cột GMV */}
                  <td className="py-3.5 px-4 text-right font-black text-gray-900">
                    {formatVnd(garage.totalGmv)}
                  </td>

                  {/* Cột Hoa hồng sàn */}
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                    {formatVnd(garage.platformCommission)}
                  </td>

                  {/* Cột Thời gian tiếp cận trung bình */}
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      garage.avgArrivalTimeMinutes <= 15
                        ? 'bg-emerald-50 text-emerald-700'
                        : garage.avgArrivalTimeMinutes <= 30
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {garage.avgArrivalTimeMinutes > 0 ? `${garage.avgArrivalTimeMinutes}p` : '—'}
                    </span>
                  </td>

                  {/* Cột Đánh giá sao */}
                  <td className="py-3.5 px-4 text-center">
                    {garage.ratingCount > 0 ? (
                      <div className="flex items-center justify-center gap-1 font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{garage.avgRating.toFixed(1)}</span>
                        <span className="text-[10px] text-gray-400 font-normal">({garage.ratingCount})</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs font-medium" title="Chưa có đánh giá từ khách hàng">
                        — <span className="text-[10px] text-gray-300">(0)</span>
                      </span>
                    )}
                  </td>

                  {/* Cột Khiếu nại */}
                  <td className="py-3.5 px-4 text-center">
                    {garage.complaintCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 font-black text-[10px] animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        {garage.complaintCount} vụ
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[11px]">0</span>
                    )}
                  </td>

                  {/* Cột Xếp loại */}
                  <td className="py-3.5 px-4 text-center">
                    {garage.healthBadge === 'EXCELLENT' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                        <Trophy className="w-3 h-3" /> Xuất sắc
                      </span>
                    ) : garage.healthBadge === 'WARNING' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 font-bold text-[10px]">
                        <ShieldAlert className="w-3 h-3" /> Cảnh báo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                        <ShieldCheck className="w-3 h-3" /> Tốt
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="py-8 text-center text-gray-400">
                  Không tìm thấy gara nào thỏa mãn điều kiện lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer tổng kết */}
      <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>Hiển thị <strong>{filteredGarages.length}</strong> / {garages.length} đối tác gara</span>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đang trực tuyến</span>
          <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-500" /> SLA chuẩn &lt; 20 phút</span>
        </div>
      </div>
    </div>
  );
};
