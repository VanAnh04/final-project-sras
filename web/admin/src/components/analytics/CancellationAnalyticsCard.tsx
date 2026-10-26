import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { XCircle, UserX, Store, Cpu } from 'lucide-react';
import type { CancellationBreakdown } from '../../types/analytics';

interface Props {
  breakdown: CancellationBreakdown;
  totalCancelled: number;
}

const ROLE_COLORS = ['#ef4444', '#f97316', '#64748b'];

export const CancellationAnalyticsCard: React.FC<Props> = ({ breakdown, totalCancelled }) => {
  const pieData = [
    { name: 'Khách hàng hủy', value: breakdown.byCustomer, color: '#ef4444', icon: UserX },
    { name: 'Gara từ chối / hủy', value: breakdown.byGarage, color: '#f97316', icon: Store },
    { name: 'Hệ thống timeout', value: breakdown.bySystem, color: '#64748b', icon: Cpu },
  ].filter(item => item.value > 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
          <XCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base">Phân tích nguyên nhân & Bên hủy cuốc</h3>
          <p className="text-xs text-gray-500">Tổng cộng {totalCancelled} ca cứu hộ bị gián đoạn</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
        {/* Biểu đồ tròn Bên hủy (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-44 h-44 relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${val} ca`, 'Số lượng']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-400">
                Không có ca hủy
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-800">{totalCancelled}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Ca hủy</span>
            </div>
          </div>

          <div className="w-full space-y-2 mt-2">
            {pieData.map((item, idx) => {
              const Icon = item.icon;
              const pct = totalCancelled > 0 ? Math.round((item.value * 1000) / totalCancelled) / 10 : 0;
              return (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-semibold text-gray-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{item.value} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top lý do hủy (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Top lý do hủy phổ biến
          </h4>
          {breakdown.topReasons && breakdown.topReasons.length > 0 ? (
            breakdown.topReasons.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-800 truncate max-w-[240px]">
                    {idx + 1}. {item.reason}
                  </span>
                  <span className="font-bold text-gray-900">
                    {item.count} ca <span className="text-gray-400 font-normal">({item.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 py-4 text-center">Không có ghi nhận lý do hủy chi tiết.</p>
          )}
        </div>
      </div>
    </div>
  );
};
