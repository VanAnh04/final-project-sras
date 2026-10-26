import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { DailyFinancialTrend } from '../../types/analytics';

interface Props {
  dailyTrends: DailyFinancialTrend[];
}

export const RevenueTrendAreaChart: React.FC<Props> = ({ dailyTrends }) => {
  const formattedData = dailyTrends.map(item => {
    const parts = item.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : item.date;
    return {
      ...item,
      displayDate: label
    };
  });

  const formatCurrencyCompact = (val: number) => {
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + ' tỷ';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' tr';
    if (val >= 1_000) return (val / 1_000).toFixed(0) + ' k';
    return val.toString();
  };

  const formatVndFull = (val: any) => {
    return [new Intl.NumberFormat('vi-VN').format(Number(val)) + ' đ'];
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[420px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Xu hướng Dòng tiền & Hoa hồng sàn (GMV vs Commission)</h3>
            <p className="text-xs text-gray-500">Biểu đồ đối chiếu tổng giá trị dịch vụ và hoa hồng thực thu theo ngày</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayDate" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                tickFormatter={formatCurrencyCompact}
              />
              <Tooltip 
                formatter={formatVndFull}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="gmv" 
                name="Tổng giá trị dịch vụ (GMV)" 
                stroke="#6366f1" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorGmv)" 
              />
              <Area 
                type="monotone" 
                dataKey="commission" 
                name="Doanh thu hoa hồng sàn" 
                stroke="#f97316" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorCommission)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            Không có dữ liệu giao dịch trong chu kỳ này
          </div>
        )}
      </div>
    </div>
  );
};
