import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { IssueTypeStat } from '../../types/analytics';

interface Props {
  topIssueTypes: IssueTypeStat[];
}

export const TopIssueTypesChart: React.FC<Props> = ({ topIssueTypes }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base">Top Sự cố Phương tiện Phổ biến</h3>
          <p className="text-xs text-gray-500">Thống kê các loại lỗi hỏng hóc thường gặp nhất</p>
        </div>
      </div>

      <div className="space-y-4 my-auto">
        {topIssueTypes && topIssueTypes.length > 0 ? (
          topIssueTypes.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">
                  {idx + 1}. {item.issueName}
                </span>
                <span className="font-extrabold text-gray-900">
                  {item.count} ca <span className="text-gray-400 font-normal">({item.percentage}%)</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 py-8 text-center">Chưa có dữ liệu phân loại sự cố chi tiết.</p>
        )}
      </div>
    </div>
  );
};
