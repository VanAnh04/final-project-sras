import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { PieChart as PieIcon, Navigation, Truck, Wrench } from 'lucide-react';
import type { FeeBreakdown } from '../../types/analytics';

interface Props {
  feeBreakdown: FeeBreakdown;
}

export const FeeBreakdownDonutChart: React.FC<Props> = ({ feeBreakdown }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const pieData = [
    { name: 'Phí cứu hộ & di chuyển', shortName: 'Cứu hộ & di chuyển', value: feeBreakdown.rescueFee, pct: feeBreakdown.rescueFeePct, color: '#f97316', icon: Navigation },
    { name: 'Phí kéo xe về xưởng', shortName: 'Kéo xe về xưởng', value: feeBreakdown.towingFee, pct: feeBreakdown.towingFeePct, color: '#ea580c', icon: Truck },
    { name: 'Tiền công & Phụ tùng', shortName: 'Công & Phụ tùng', value: feeBreakdown.serviceFee, pct: feeBreakdown.serviceFeePct, color: '#f59e0b', icon: Wrench },
  ].filter(item => item.value > 0);

  const totalFee = feeBreakdown.rescueFee + feeBreakdown.towingFee + feeBreakdown.serviceFee;

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 4}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

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
        <div className="w-48 h-48 relative flex-shrink-0 flex items-center justify-center">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  {...({
                    activeIndex: activeIndex !== null ? activeIndex : undefined,
                    activeShape: renderActiveShape
                  } as any)}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                      className="cursor-pointer transition-opacity duration-200"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              Chưa có dữ liệu
            </div>
          )}

          {/* Center Info Hole - Không bao giờ bị đè chữ */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2 text-center select-none">
            {activeIndex !== null && pieData[activeIndex] ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
                <span 
                  className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[100px] block"
                  style={{ color: pieData[activeIndex].color }}
                >
                  {pieData[activeIndex].shortName}
                </span>
                <span className="text-xs font-black text-gray-900 leading-tight mt-0.5">
                  {formatVnd(pieData[activeIndex].value)}
                </span>
                <span className="text-[10px] font-extrabold text-orange-600 mt-0.5">
                  {pieData[activeIndex].pct}%
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                  Tổng phí
                </span>
                <span className="text-sm font-black text-gray-800">
                  {totalFee >= 1_000_000 ? (totalFee / 1_000_000).toFixed(1) + 'M' : formatVnd(totalFee)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="w-full space-y-3">
          {pieData.map((item, idx) => {
            const Icon = item.icon;
            const isHovered = activeIndex === idx;

            return (
              <div 
                key={idx} 
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isHovered 
                    ? 'bg-orange-50/80 border-orange-200 shadow-xs scale-[1.02]' 
                    : 'bg-gray-50/80 border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <Icon className={`w-4 h-4 ${isHovered ? 'text-orange-600' : 'text-gray-500'}`} />
                  <div>
                    <div className="text-xs font-bold text-gray-800">{item.name}</div>
                    <div className="text-[11px] text-gray-400 font-medium">{formatVnd(item.value)}</div>
                  </div>
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-lg border shadow-2xs ${
                  isHovered 
                    ? 'bg-orange-500 text-white border-orange-600' 
                    : 'bg-white text-gray-900 border-gray-200'
                }`}>
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
