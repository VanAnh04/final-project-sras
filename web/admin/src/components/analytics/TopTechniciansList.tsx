import { Users, Star, Trophy, Building2, CheckCircle2 } from 'lucide-react';
import type { TechnicianPerformanceStat } from '../../types/analytics';

interface Props {
  technicians: TechnicianPerformanceStat[];
}

export const TopTechniciansList = ({ technicians }: Props) => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Top Kỹ Thuật Viên Xuất Sắc</h4>
            <p className="text-xs text-gray-400">Đội ngũ thợ có số ca hoàn thành và điểm hài lòng cao nhất</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
        {technicians.length > 0 ? (
          technicians.map((tech) => (
            <div
              key={tech.staffId}
              className="p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/20 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                {/* Thứ hạng */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                  tech.rank === 1
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : tech.rank === 2
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : tech.rank === 3
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : 'bg-gray-50 text-gray-500'
                }`}>
                  {tech.rank <= 3 ? <Trophy className="w-3.5 h-3.5" /> : `#${tech.rank}`}
                </div>

                <div>
                  <h5 className="font-extrabold text-gray-900 text-xs group-hover:text-orange-600 transition-colors">
                    {tech.staffName}
                  </h5>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                    <Building2 className="w-3 h-3 text-gray-400" />
                    <span className="truncate max-w-[140px]">{tech.garageName}</span>
                  </div>
                </div>
              </div>

              {/* Thông số ca & đánh giá */}
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="font-black text-gray-900 text-xs flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {tech.completedJobs} ca
                  </div>
                  {tech.ratingCount > 0 ? (
                    <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-amber-500 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{tech.avgRating.toFixed(1)}</span>
                      <span className="text-[10px] text-gray-400 font-normal">({tech.ratingCount})</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                      <span>—</span> <span className="text-[10px] text-gray-300">(0)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-gray-400 text-xs">
            Chưa có số liệu kỹ thuật viên trong kỳ này.
          </div>
        )}
      </div>
    </div>
  );
};
