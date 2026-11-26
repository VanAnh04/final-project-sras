import PartnerGaragesMap from '../../components/dashboard/PartnerGaragesMap';
import { Radio, Navigation } from 'lucide-react';

export default function LiveMapPage() {
  return (
    <div className="w-full space-y-5 pb-10">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-2xs">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Bản đồ Sự cố Thời gian thực
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-red-50 text-red-600 border border-red-200">
                  Real-time GPS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                Giám sát trực tiếp các Gara đang mở cửa (phát sáng), Gara đang nghỉ, tọa độ đơn sự cố và lộ trình di chuyển của kỹ thuật viên tới khách hàng
              </p>
            </div>
          </div>
        </div>

        {/* Thông tin GPS */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 font-bold">
            <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>App nhân viên đẩy GPS liên tục 0.1s</span>
          </div>
        </div>
      </div>

      {/* Bản đồ thời gian thực toàn trang */}
      <PartnerGaragesMap fullPage={true} />
    </div>
  );
}
