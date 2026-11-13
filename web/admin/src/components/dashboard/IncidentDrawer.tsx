import { X, AlertTriangle, PhoneCall, Zap } from 'lucide-react';

interface IncidentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
}

export default function IncidentDrawer({ isOpen, onClose, incidentId }: IncidentDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Chi tiết sự cố #{incidentId}</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alert Box */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-4">
            <div className="mt-0.5">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-red-700 font-bold mb-1">Cảnh báo va chạm mức độ Cao</h3>
              <p className="text-sm text-red-600/80 leading-relaxed">
                Hệ thống phát hiện xung lực 4.8G tại sườn trái xe. Khả năng cao có thương vong hoặc hư hỏng nặng.
              </p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Phương tiện</p>
              <p className="font-bold text-gray-900">Toyota Camry</p>
              <p className="text-sm text-gray-500">30A-123.45 (Đen)</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Chủ xe</p>
              <p className="font-bold text-gray-900">Nguyễn Văn A</p>
              <p className="text-sm text-gray-500">0908 *** 456</p>
            </div>
          </div>

          {/* Video Player Mockup */}
          <div className="rounded-xl overflow-hidden relative bg-black aspect-video group cursor-pointer">
            <img 
              src="https://images.unsplash.com/photo-1541443131876-44b03de101c5?q=80&w=2068&auto=format&fit=crop" 
              alt="Dashcam footage" 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[14px] border-l-white border-b-8 border-b-transparent ml-1"></div>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              🔴 LIVE
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-100 grid grid-cols-2 gap-4 bg-white">
          <button className="flex items-center justify-center gap-2 bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-orange-700 transition-colors">
            <Zap className="w-5 h-5" />
            ĐIỀU ĐỘNG NGAY
          </button>
          <button className="flex items-center justify-center gap-2 bg-white text-orange-600 border-2 border-orange-200 font-bold py-3.5 px-4 rounded-xl hover:bg-orange-50 hover:border-orange-600 transition-colors">
            <PhoneCall className="w-5 h-5" />
            GỌI CHỦ XE
          </button>
        </div>
      </div>
    </>
  );
}
