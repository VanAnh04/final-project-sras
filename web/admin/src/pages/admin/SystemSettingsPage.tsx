import { useState, useEffect } from 'react';
import {
  Bike,
  Car,
  Sun,
  Moon,
  Calculator,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import { pricingConfigApi } from '../../api/pricingConfigApi';
import type { RescuePricingConfig, RescuePricingConfigRequest } from '../../api/pricingConfigApi';

type VehicleTab = 'MOTORBIKE' | 'CAR';

const formatVnd = (num: number) => {
  return (num || 0).toLocaleString('vi-VN') + ' đ';
};

const formatCurrencyInput = (value: string | number) => {
  if (value === undefined || value === null || value === '') return '';
  const digitsOnly = String(value).replace(/\D/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString('vi-VN');
};

const parseCurrencyInput = (value: string): number => {
  const digitsOnly = String(value).replace(/\D/g, '');
  return digitsOnly ? Number(digitsOnly) : 0;
};

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<VehicleTab>('MOTORBIKE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states per vehicle type
  const [configs, setConfigs] = useState<Record<VehicleTab, RescuePricingConfigRequest>>({
    MOTORBIKE: {
      vehicleType: 'MOTORBIKE',
      feePerKmDay: 15000,
      feePerKmNight: 20000,
      minFee: 30000,
      freeKm: 0,
      nightStartHour: 22,
      nightStartMinute: 0,
      nightEndHour: 6,
      nightEndMinute: 0,
      holidaySurgeEnabled: false,
      holidaySurchargePct: 20,
      displayNote: 'Biểu phí chuẩn cứu hộ xe máy',
    },
    CAR: {
      vehicleType: 'CAR',
      feePerKmDay: 25000,
      feePerKmNight: 35000,
      minFee: 50000,
      freeKm: 0,
      nightStartHour: 22,
      nightStartMinute: 0,
      nightEndHour: 6,
      nightEndMinute: 0,
      holidaySurgeEnabled: false,
      holidaySurchargePct: 20,
      displayNote: 'Biểu phí chuẩn cứu hộ ô tô',
    },
  });

  // Simulator states
  const [simDistance, setSimDistance] = useState<number>(5);
  const [simIsNight, setSimIsNight] = useState<boolean>(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await pricingConfigApi.getAllConfigs();
      if (res && res.data) {
        const next = { ...configs };
        res.data.forEach((c: RescuePricingConfig) => {
          if (c.vehicleType === 'MOTORBIKE' || c.vehicleType === 'CAR') {
            next[c.vehicleType] = {
              vehicleType: c.vehicleType,
              feePerKmDay: c.feePerKmDay,
              feePerKmNight: c.feePerKmNight,
              minFee: c.minFee,
              freeKm: c.freeKm,
              nightStartHour: c.nightStartHour,
              nightStartMinute: c.nightStartMinute ?? 0,
              nightEndHour: c.nightEndHour,
              nightEndMinute: c.nightEndMinute ?? 0,
              holidaySurgeEnabled: c.holidaySurgeEnabled ?? false,
              holidaySurchargePct: c.holidaySurchargePct || 20,
              displayNote: c.displayNote || '',
            };
          }
        });
        setConfigs(next);
      }
    } catch (err: any) {
      console.error('Lỗi tải cấu hình biểu phí:', err);
      setErrorMsg('Không thể tải cấu hình biểu phí từ máy chủ. Đang dùng cấu hình mặc định.');
    } finally {
      setLoading(false);
    }
  };

  const currentConfig = configs[activeTab];

  const formatTimeValue = (hour: number, minute?: number) => {
    const h = String(hour ?? 0).padStart(2, '0');
    const m = String(minute ?? 0).padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleTimeChange = (type: 'start' | 'end', val: string) => {
    if (!val) return;
    const parts = val.split(':');
    const h = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));

    setConfigs(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        ...(type === 'start'
          ? { nightStartHour: h, nightStartMinute: m }
          : { nightEndHour: h, nightEndMinute: m }),
      },
    }));
    setSuccessMsg(null);
  };

  const handleFieldChange = (field: keyof RescuePricingConfigRequest, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }));
    setSuccessMsg(null);
  };

  const handleToggleHolidaySurge = () => {
    const nextVal = !currentConfig.holidaySurgeEnabled;
    setConfigs(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        holidaySurgeEnabled: nextVal,
        // Nếu bật mà % đang là 0 thì đặt 20%
        holidaySurchargePct: nextVal && (!prev[activeTab].holidaySurchargePct || prev[activeTab].holidaySurchargePct === 0)
          ? 20
          : prev[activeTab].holidaySurchargePct,
      },
    }));
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      await pricingConfigApi.updateConfig(activeTab, currentConfig);
      setSuccessMsg(`Đã lưu cấu hình biểu phí cho ${activeTab === 'MOTORBIKE' ? 'Xe máy' : 'Ô tô'} thành công!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Lỗi lưu biểu phí:', err);
      setErrorMsg(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  // Tính thử live
  const calculateSimFee = () => {
    const rate = simIsNight ? currentConfig.feePerKmNight : currentConfig.feePerKmDay;
    const effectiveKm = Math.max(0, simDistance - currentConfig.freeKm);
    let amount = effectiveKm * rate;
    if (currentConfig.holidaySurgeEnabled && currentConfig.holidaySurchargePct > 0) {
      amount = amount * (1 + currentConfig.holidaySurchargePct / 100);
    }
    const finalFee = Math.max(currentConfig.minFee, Math.round(amount));
    return Math.round(finalFee / 1000) * 1000;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Đang tải cài đặt hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Cài Đặt Hệ Thống</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Quản lý biểu phí cứu hộ theo km, ban ngày / ban đêm và chính sách cước
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-sm transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu Cài Đặt</span>
            </>
          )}
        </button>
      </div>

      {/* Thông báo Alert */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-sm text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl shadow-sm text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Tabs chuyển loại phương tiện */}
      <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-sm border">
        <button
          onClick={() => {
            setActiveTab('MOTORBIKE');
            setSuccessMsg(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'MOTORBIKE'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <Bike className="w-5 h-5" />
          <span>Cứu hộ Xe Máy</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('CAR');
            setSuccessMsg(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'CAR'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <Car className="w-5 h-5" />
          <span>Cứu hộ Ô Tô</span>
        </button>
      </div>

      {/* Layout Grid: Form Cài đặt & Bảng Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái: Form cấu hình */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Cước phí km */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Sun className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-gray-900">
                1. Biểu Phí Di Chuyển Theo Km (Khoản ①)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  ☀️ Ban ngày ({formatTimeValue(currentConfig.nightEndHour, currentConfig.nightEndMinute)} – {formatTimeValue(currentConfig.nightStartHour, currentConfig.nightStartMinute)})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatCurrencyInput(currentConfig.feePerKmDay)}
                    onChange={(e) => handleFieldChange('feePerKmDay', parseCurrencyInput(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="15.000"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-medium text-gray-400">
                    đ / km
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Áp dụng cự ly di chuyển ban ngày</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  🌙 Ban đêm ({formatTimeValue(currentConfig.nightStartHour, currentConfig.nightStartMinute)} – {formatTimeValue(currentConfig.nightEndHour, currentConfig.nightEndMinute)})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatCurrencyInput(currentConfig.feePerKmNight)}
                    onChange={(e) => handleFieldChange('feePerKmNight', parseCurrencyInput(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="20.000"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-medium text-gray-400">
                    đ / km
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Áp dụng cự ly di chuyển ban đêm</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  🛡️ Cước tối thiểu mở cửa
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatCurrencyInput(currentConfig.minFee)}
                    onChange={(e) => handleFieldChange('minFee', parseCurrencyInput(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="30.000"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-medium text-gray-400">
                    VNĐ
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Cước sàn tối thiểu bù công xuất phát</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  🆓 Cự ly miễn phí đầu tiên
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={currentConfig.freeKm}
                    onChange={(e) => handleFieldChange('freeKm', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    placeholder="0"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-medium text-gray-400">
                    km
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Số km đầu tiên không tính cước (0 = không có)</p>
              </div>
            </div>
          </div>

          {/* Card 2: Khung giờ & Phụ phí lễ */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-gray-900">
                2. Khung Giờ Ban Đêm & Phụ Phí Dịp Lễ
              </h2>
            </div>

            {/* Khung giờ ban đêm */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Cài đặt khung giờ ban đêm
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 h-5 flex items-center">
                    🌙 Bắt đầu giờ đêm
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={formatTimeValue(currentConfig.nightStartHour, currentConfig.nightStartMinute)}
                      onChange={(e) => handleTimeChange('start', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 h-5 flex items-center">
                    ☀️ Kết thúc giờ đêm
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={formatTimeValue(currentConfig.nightEndHour, currentConfig.nightEndMinute)}
                      onChange={(e) => handleTimeChange('end', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Công tắc Bật / Tắt Phụ phí Lễ / Tết */}
            <div className={`p-4 rounded-xl border transition-all ${currentConfig.holidaySurgeEnabled
                ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                : 'bg-gray-50/60 border-gray-200'
              }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${currentConfig.holidaySurgeEnabled ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className="text-sm font-bold text-gray-900">
                      Phụ Phí Dịp Lễ / Tết (Bật/Tắt thủ công)
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${currentConfig.holidaySurgeEnabled
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                      }`}>
                      {currentConfig.holidaySurgeEnabled ? `ĐANG BẬT (+${currentConfig.holidaySurchargePct}%)` : 'ĐÃ TẮT'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 max-w-md">
                    {currentConfig.holidaySurgeEnabled
                      ? `Hệ thống đang cộng thêm ${currentConfig.holidaySurchargePct}% vào cước di chuyển cho các cuốc cứu hộ dịp lễ. Hết kỳ nghỉ, vui lòng gạt TẮT công tắc.`
                      : 'Đang tắt phụ phí. Tính cước ngày/đêm bình thường. Gạt BẬT công tắc khi bước vào các kỳ nghỉ lễ dài ngày (Tết, 30/4, 2/9...).'}
                  </p>
                </div>

                {/* Cụm công tắc Switch & Ô nhập % */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleHolidaySurge}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${currentConfig.holidaySurgeEnabled ? 'bg-amber-500' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${currentConfig.holidaySurgeEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <div className="relative w-20">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={!currentConfig.holidaySurgeEnabled}
                        value={currentConfig.holidaySurchargePct}
                        onChange={(e) => handleFieldChange('holidaySurchargePct', Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        className={`w-full px-2.5 py-1.5 border rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${currentConfig.holidaySurgeEnabled
                            ? 'bg-white border-amber-300 text-gray-900'
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        placeholder="20"
                      />
                      <span className="absolute right-2 top-1.5 text-xs font-semibold text-gray-400">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Ghi chú biểu phí hiển thị cho Gara & Khách hàng
              </label>
              <input
                type="text"
                value={currentConfig.displayNote || ''}
                onChange={(e) => handleFieldChange('displayNote', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                placeholder="VD: Biểu phí tiêu chuẩn khu vực TP.HCM"
              />
            </div>
          </div>
        </div>

        {/* Cột phải: Live Preview & Quy định nghiệp vụ */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Simulator */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-gray-700/60 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold">Mô Phỏng Cước Phí Mẫu</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 font-semibold">
                {activeTab === 'MOTORBIKE' ? 'Xe Máy' : 'Ô Tô'}
              </span>
            </div>

            {/* Điều khiển cự ly */}
            <div>
              <div className="flex justify-between items-center text-xs text-gray-300 mb-2 font-medium">
                <span>Khoảng cách di chuyển:</span>
                <span className="text-orange-400 font-bold text-sm">{simDistance} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={simDistance}
                onChange={(e) => setSimDistance(Number(e.target.value))}
                className="w-full accent-orange-500 bg-gray-700 rounded-lg cursor-pointer h-2"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>1 km</span>
                <span>15 km</span>
                <span>30 km</span>
              </div>
            </div>

            {/* Toggle ngày / đêm */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800/80 rounded-xl border border-gray-700">
              <button
                type="button"
                onClick={() => setSimIsNight(false)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${!simIsNight
                    ? 'bg-amber-500 text-gray-950 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Ban ngày</span>
              </button>
              <button
                type="button"
                onClick={() => setSimIsNight(true)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${simIsNight
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Ban đêm</span>
              </button>
            </div>

            {/* Kết quả tính */}
            <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700/60 space-y-2">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Đơn giá áp dụng:</span>
                <span className="font-semibold text-white">
                  {formatVnd(simIsNight ? currentConfig.feePerKmNight : currentConfig.feePerKmDay)} / km
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-300">
                <span>Cự ly tính cước:</span>
                <span className="font-semibold text-white">
                  {Math.max(0, simDistance - currentConfig.freeKm)} km
                </span>
              </div>
              {currentConfig.holidaySurgeEnabled && currentConfig.holidaySurchargePct > 0 ? (
                <div className="flex justify-between text-xs text-amber-300">
                  <span>Phụ phí lễ (+{currentConfig.holidaySurchargePct}%):</span>
                  <span className="font-semibold text-amber-400">Đang áp dụng</span>
                </div>
              ) : (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Phụ phí lễ:</span>
                  <span>Đã tắt (0%)</span>
                </div>
              )}
              <div className="border-t border-gray-700 pt-2 flex justify-between items-baseline">
                <span className="text-xs text-gray-300 font-semibold">Phí di chuyển ①:</span>
                <span className="text-xl font-extrabold text-orange-400">
                  {formatVnd(calculateSimFee())}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 italic">
              💡 Đây chính là số tiền hiển thị trên popup nổ đơn cho Gara và là <strong>khoản phí tối thiểu</strong> khách hàng phải thanh toán khi NV đã đến nơi kiểm tra.
            </p>
          </div>

          {/* Quy định 3 khoản phí */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <Info className="w-4 h-4 text-orange-500" />
              <span>Chính Sách 3 Khoản Phí Toàn Hệ Thống</span>
            </div>

            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-100/80">
                <strong className="text-orange-900 block mb-0.5">① Phí di chuyển (Biểu phí trên)</strong>
                Hệ thống tự động tính theo km GPS. Khách <strong>bắt buộc phải thanh toán</strong> kể cả khi từ chối sửa chữa hay từ chối kéo xe.
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100/80">
                <strong className="text-blue-900 block mb-0.5">② Phụ phí kéo xe về xưởng (Gara quyết định)</strong>
                Gara/KTV trực tiếp khảo sát hiện trường (lật xe, kẹt hầm, cự ly) và báo giá riêng cho khách duyệt.
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100/80">
                <strong className="text-emerald-900 block mb-0.5">③ Phí sửa chữa / phụ tùng (Qua nền tảng)</strong>
                Thanh toán toàn bộ qua nền tảng, hệ thống tính hoa hồng chiết khấu trên tổng số tiền của đơn.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
