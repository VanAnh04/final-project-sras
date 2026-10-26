import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { Clock } from 'lucide-react';
import type { HourlyIncidentStat } from '../../types/analytics';

interface Props {
  hourlyDistribution: HourlyIncidentStat[];
  peakHourLabel: string;
}

export const PeakHoursBarChart: React.FC<Props> = ({ hourlyDistribution, peakHourLabel }) => {
  // Tìm max count
  const maxVal = Math.max(...hourlyDistribution.map(d => d.count), 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Phân bổ Sự cố theo 24 giờ trong ngày</h3>
            <p className="text-xs text-gray-500">
              Nhận diện khung giờ cao điểm (Đỉnh: <span className="text-orange-600 font-bold">{peakHourLabel}</span>)
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11 }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11 }} 
            />
            <Tooltip 
              formatter={(val: any) => [`${val} ca`, 'Số lượng sự cố']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {hourlyDistribution.map((entry, index) => {
                const isPeak = entry.count === maxVal && maxVal > 0;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isPeak ? '#f97316' : '#3b82f6'} 
                  />
                );
              })}
            </BarBar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
