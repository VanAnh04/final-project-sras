import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon, Navigation, Truck, Wrench } from 'lucide-react';
import type { FeeBreakdown } from '../../types/analytics';

interface Props {
  feeBreakdown: FeeBreakdown;
}

export const FeeBreakdownDonutChart: React.FC<Props> = ({ feeBreakdown }) => {
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const pieData = [
    { name: 'Phí cứu hộ & di chuyển', value: feeBreakdown.rescueFee, pct: feeBreakdown.rescueFeePct, color: '#f97316', icon: Navigation },
    { name: 'Phí kéo xe về xưởng', value: feeBreakdown.towingFee, pct: feeBreakdown.towingFeePct, color: '#3b82f6', icon: Truck },
    { name: 'Tiền công & Phụ tùng', value: feeBreakdown.serviceFee, pct: feeBreakdown.serviceFeePct, color: '#10b981', icon: Wrench },
  ].filter(item => item.value > 0);

  const totalFee = feeBreakdown.rescueFee + feeBreakdown.towingFee + feeBreakdown.serviceFee;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
          <PieIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base">Cơ cấu Nguồn thu Dịch vụ</h3>
          <p className="text-xs text-gray-500">Tỷ trọng giữa phí cứu hộ, phí kéo xe và tiền sửa chữa</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
        {/* Donut Chart */}
        <div className="w-44 h-44 relative flex-shrink-0">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => [formatVnd(Number(val)), 'Doanh số']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              Chưa có dữ liệu
            </div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Tổng phí</span>
            <span className="text-sm font-black text-gray-800">
              {totalFee >= 1_000_000 ? (totalFee / 1_000_000).toFixed(1) + 'M' : formatVnd(totalFee)}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="w-full space-y-3">
          {pieData.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <Icon className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="text-xs font-bold text-gray-800">{item.name}</div>
                    <div className="text-[11px] text-gray-400 font-medium">{formatVnd(item.value)}</div>
                  </div>
                </div>
                <span className="text-xs font-black text-gray-900 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-2xs">
                  {item.pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
