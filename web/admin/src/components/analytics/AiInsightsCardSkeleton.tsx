import React from 'react';
import { Sparkles } from 'lucide-react';

interface AiInsightsCardSkeletonProps {
  loadingMessage?: string;
  subMessage?: string;
}

export const AiInsightsCardSkeleton: React.FC<AiInsightsCardSkeletonProps> = ({
  loadingMessage = 'Hệ thống đang phân tích dữ liệu...',
  subMessage
}) => {
  return (
    <div className="p-8 flex flex-col items-center justify-center text-center min-h-[520px] relative overflow-hidden bg-white">
      {/* Hiệu ứng ánh sáng nền mờ nhẹ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl pointer-events-none" />

      {/* Icon phân tích xoay tròn */}
      <div className="relative mb-4 z-10">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center shadow-sm">
          <Sparkles className="w-8 h-8 animate-spin duration-1000 text-orange-500" />
        </div>
      </div>

      {/* Dòng chữ hệ thống đang phân tích */}
      <div className="max-w-lg space-y-1.5 relative z-10 px-4">
        <h4 className="font-bold text-gray-800 text-sm md:text-base tracking-tight">
          {loadingMessage}
        </h4>
        {subMessage && (
          <p className="text-xs text-gray-400 font-normal leading-relaxed">
            {subMessage}
          </p>
        )}
      </div>

      {/* Thanh tiến trình phân tích mượt mà */}
      <div className="w-full max-w-xs h-1.5 bg-orange-100/70 rounded-full mt-5 overflow-hidden relative z-10">
        <div 
          className="absolute top-0 bottom-0 left-0 bg-orange-500 rounded-full shadow-sm"
          style={{
            animation: 'shimmerSlide 1.8s infinite ease-in-out'
          }} 
        />
      </div>

      <style>{`
        @keyframes shimmerSlide {
          0% { transform: translateX(-100%); width: 30%; }
          50% { width: 50%; }
          100% { transform: translateX(350%); width: 30%; }
        }
      `}</style>
    </div>
  );
};
