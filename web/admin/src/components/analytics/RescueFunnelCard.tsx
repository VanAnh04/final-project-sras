import React from 'react';
import { Filter, ArrowRight, ShieldCheck } from 'lucide-react';
import type { FunnelStage } from '../../types/analytics';

interface Props {
  funnel: FunnelStage;
}

export const RescueFunnelCard: React.FC<Props> = ({ funnel }) => {
  const steps = [
    { label: 'Tạo yêu cầu', count: funnel.created, color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' },
    { label: 'Gara nhận ca', count: funnel.accepted, color: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
    { label: 'Thợ lên đường', count: funnel.enRoute, color: 'bg-orange-50 text-orange-700', border: 'border-orange-200' },
    { label: 'Đến hiện trường', count: funnel.arrived, color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
    { label: 'Hoàn tất cứu hộ', count: funnel.completed, color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
  ];

  const overallConversion = funnel.created > 0 
    ? Math.round((funnel.completed * 1000) / funnel.created) / 10 
    : 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Phễu chuyển đổi cứu hộ</h3>
            <p className="text-xs text-gray-500">Tỷ lệ giữ chân qua từng giai đoạn xử lý</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          Tỷ lệ chuyển đổi tổng: {overallConversion}%
        </div>
      </div>

      {/* Funnel Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 my-auto">
        {steps.map((step, idx) => {
          const prevCount = idx === 0 ? step.count : steps[idx - 1].count;
          const dropRate = prevCount > 0 ? Math.round(((prevCount - step.count) * 1000) / prevCount) / 10 : 0;
          const stepConversion = funnel.created > 0 ? Math.round((step.count * 1000) / funnel.created) / 10 : 0;

          return (
            <div key={idx} className="relative flex flex-col items-center">
              <div className={`w-full p-4 rounded-xl border ${step.border} ${step.color} text-center transition-all hover:scale-[1.02]`}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1 opacity-80">Bước {idx + 1}</div>
                <div className="text-sm font-bold truncate mb-2">{step.label}</div>
                <div className="text-2xl font-black">{step.count.toLocaleString()}</div>
                <div className="text-[11px] font-semibold mt-1 opacity-90 leading-tight">
                  {stepConversion}% tổng số
                  {idx > 0 && dropRate > 0 && (
                    <span className="text-red-500 font-bold ml-1 whitespace-nowrap">
                      (Hao hụt -{dropRate}%)
                    </span>
                  )}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white rounded-full border border-gray-200 items-center justify-center text-gray-400 shadow-xs">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
