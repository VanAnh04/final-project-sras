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
  Sparkles,
  Scale,
  MapPin,
  ClipboardList,
  Star,
  Activity,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { pricingConfigApi } from '../../api/pricingConfigApi';
import type { RescuePricingConfig, RescuePricingConfigRequest } from '../../api/pricingConfigApi';
import { dispatchConfigApi, type UpdateDispatchConfigRequest } from '../../api/dispatchConfigApi';

type ActiveTab = 'MOTORBIKE' | 'CAR' | 'DISPATCH_SCORING';

const formatVnd = (num: number) => {
  return (num || 0).toLocaleString('vi-VN') + ' đ';
};

/**
 * Component ô nhập tiền tệ thông minh:
 * - Khi bình thường (Blur): Hiển thị có chấm phân tách (VD: 10.000 VNĐ).
 * - Khi bấm vào gõ (Focus): Tự động bôi đen toàn bộ để gõ đè, hiển thị số thuần không chấm (VD: 10000)
 *   giúp người dùng gõ số, xoá số mượt mà, không bị nhảy giật hay chèn số thừa (như lỗi gõ 10000 ra 110.000).
 */
function MoneyInput({
  value,
  onChange,
  placeholder,
  suffix = 'VNĐ',
  className = '',
}: {
  value: number | undefined;
  onChange: (val: number) => void;
  placeholder?: string;
  suffix?: string;
  className?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState(value ? String(value) : '');

  useEffect(() => {
    if (!isFocused) {
      setRawText(value ? String(value) : '');
    }
  }, [value, isFocused]);

  const displayValue = isFocused
    ? rawText
    : (value !== undefined && value !== null && value !== 0 ? value.toLocaleString('vi-VN') : '');

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={(e) => {
          setIsFocused(true);
          const current = value ? String(value) : '';
          setRawText(current);
          // Tự động bôi đen toàn bộ số khi click để người dùng gõ đè số mới ngay
          setTimeout(() => e.target.select(), 0);
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          setRawText(digits);
          onChange(digits ? Number(digits) : 0);
        }}
        onBlur={() => {
          setIsFocused(false);
          const digits = rawText.replace(/\D/g, '');
          onChange(digits ? Number(digits) : 0);
        }}
        placeholder={placeholder}
        className={`w-full pl-3.5 pr-14 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 ${className}`}
      />
      {suffix && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/**
 * Component ô nhập km cự ly:
 * - Hỗ trợ số thập phân (VD: 1.5, 2.0).
 * - Bôi đen toàn bộ khi click, không có mũi tên tăng giảm trình duyệt gây đè chữ.
 */
function KmInput({
  value,
  onChange,
  onBlurDefault,
  placeholder,
  className = '',
}: {
  value: number | string | undefined;
  onChange: (val: number | string) => void;
  onBlurDefault: number;
  placeholder?: string;
  className?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState(value !== undefined && value !== null ? String(value) : '');

  useEffect(() => {
    if (!isFocused) {
      setRawText(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value, isFocused]);

  const displayValue = isFocused ? rawText : (value ?? '');

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onFocus={(e) => {
          setIsFocused(true);
          const current = value !== undefined && value !== null ? String(value) : '';
          setRawText(current);
          setTimeout(() => e.target.select(), 0);
        }}
        onChange={(e) => {
          const sanitized = e.target.value.replace(/[^0-9.]/g, '');
          const parts = sanitized.split('.');
          const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
          setRawText(formatted);
          onChange(formatted);
        }}
        onBlur={() => {
          setIsFocused(false);
          const num = parseFloat(rawText);
          const finalVal = isNaN(num) || num <= 0 ? onBlurDefault : Number(num.toFixed(1));
          onChange(finalVal);
        }}
        placeholder={placeholder}
        className={`w-full pl-3.5 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 ${className}`}
      />
      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none select-none">
        km
      </span>
    </div>
  );
}

/**
 * Component ô nhập số nguyên an toàn:
 * - Không có mũi tên tăng giảm trình duyệt gây đè chữ.
 * - Tự động bôi đen khi click, gõ mượt mà không bị nhảy số hay cưỡng bức về 0 khi xoá.
 */
function IntegerInput({
  value,
  onChange,
  onBlurDefault = 25,
  min = 0,
  max = 50,
  suffix,
  placeholder,
  className = '',
}: {
  value: number | string | undefined;
  onChange: (val: number) => void;
  onBlurDefault?: number;
  min?: number;
  max?: number;
  suffix?: string;
  placeholder?: string;
  className?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState(value !== undefined && value !== null ? String(value) : '');

  useEffect(() => {
    if (!isFocused) {
      setRawText(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value, isFocused]);

  const displayValue = isFocused ? rawText : (value !== undefined && value !== null ? String(value) : '');

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={(e) => {
          setIsFocused(true);
          const current = value !== undefined && value !== null ? String(value) : '';
          setRawText(current);
          setTimeout(() => e.target.select(), 0);
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          setRawText(digits);
          if (digits !== '') {
            const num = parseInt(digits, 10);
            onChange(Math.min(max, Math.max(min, num)));
          }
        }}
        onBlur={() => {
          setIsFocused(false);
          if (rawText === '') {
            onChange(onBlurDefault);
          } else {
            const num = parseInt(rawText, 10);
            const clamped = isNaN(num) ? onBlurDefault : Math.min(max, Math.max(min, num));
            onChange(clamped);
          }
        }}
        placeholder={placeholder}
        className={`w-full pl-3.5 pr-22 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
      />
      {suffix && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('MOTORBIKE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDispatch, setSavingDispatch] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states per vehicle type
  const [configs, setConfigs] = useState<Record<'MOTORBIKE' | 'CAR', RescuePricingConfigRequest>>({
    MOTORBIKE: {
      vehicleType: 'MOTORBIKE',
      baseKm: 2.0,
      baseFareDay: 30000,
      baseFareNight: 40000,
      kmTier2Limit: 10.0,
      feePerKmTier2Day: 10000,
      feePerKmTier2Night: 13000,
      feePerKmTier3Day: 7000,
      feePerKmTier3Night: 9000,
      feePerKmDay: 10000,
      feePerKmNight: 13000,
      minFee: 30000,
      freeKm: 0,
      nightStartHour: 22,
      nightStartMinute: 0,
      nightEndHour: 6,
      nightEndMinute: 0,
      holidaySurgeEnabled: false,
      holidaySurchargePct: 20,
      displayNote: 'Biểu phí tiêu chuẩn cứu hộ xe máy theo bậc cước',
    },
    CAR: {
      vehicleType: 'CAR',
      baseKm: 2.0,
      baseFareDay: 60000,
      baseFareNight: 80000,
      kmTier2Limit: 10.0,
      feePerKmTier2Day: 20000,
      feePerKmTier2Night: 25000,
      feePerKmTier3Day: 15000,
      feePerKmTier3Night: 18000,
      feePerKmDay: 20000,
      feePerKmNight: 25000,
      minFee: 60000,
      freeKm: 0,
      nightStartHour: 22,
      nightStartMinute: 0,
      nightEndHour: 6,
      nightEndMinute: 0,
      holidaySurgeEnabled: false,
      holidaySurchargePct: 20,
      displayNote: 'Biểu phí tiêu chuẩn cứu hộ ô tô theo bậc cước',
    },
  });

  // State cho Thuật toán Điều phối Công bằng (Multi-Factor Scoring)
  const [dispatchConfig, setDispatchConfig] = useState<UpdateDispatchConfigRequest>({
    weightDistance: 40,
    weightWorkload: 30,
    weightRating: 20,
    weightResponseRate: 10,
    penaltyPerOrder: 10,
  });

  // Simulator states for Rescue Pricing
  const [simDistance, setSimDistance] = useState<number>(5);
  const [simIsNight, setSimIsNight] = useState<boolean>(false);

  // Simulator states for Dispatch Scoring (Kéo cự ly, đơn hôm nay, đánh giá sao, tỉ lệ nhận đơn)
  const [simScoreDist, setSimScoreDist] = useState<number>(3.5);
  const [simScoreOrders, setSimScoreOrders] = useState<number>(1);
  const [simScoreRating, setSimScoreRating] = useState<number>(4.8);
  const [simScoreRespRate, setSimScoreRespRate] = useState<number>(95);

  // Quản lý hiển thị chi tiết công thức tính điểm (nhấn vào mới hiện ra chi tiết)
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const toggleDetail = (key: string) => {
    setExpandedDetails(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [pricingRes, dispatchRes] = await Promise.allSettled([
        pricingConfigApi.getAllConfigs(),
        dispatchConfigApi.getConfig(),
      ]);

      if (pricingRes.status === 'fulfilled' && pricingRes.value?.data) {
        const next = { ...configs };
        pricingRes.value.data.forEach((c: RescuePricingConfig) => {
          if (c.vehicleType === 'MOTORBIKE' || c.vehicleType === 'CAR') {
            next[c.vehicleType] = {
              vehicleType: c.vehicleType,
              baseKm: c.baseKm ?? 2.0,
              baseFareDay: c.baseFareDay ?? (c.minFee || 30000),
              baseFareNight: c.baseFareNight ?? (c.minFee ? Math.round(c.minFee * 1.3) : 40000),
              kmTier2Limit: c.kmTier2Limit ?? 10.0,
              feePerKmTier2Day: c.feePerKmTier2Day ?? (c.feePerKmDay || 10000),
              feePerKmTier2Night: c.feePerKmTier2Night ?? (c.feePerKmNight || 13000),
              feePerKmTier3Day: c.feePerKmTier3Day ?? 7000,
              feePerKmTier3Night: c.feePerKmTier3Night ?? 9000,
              feePerKmDay: c.feePerKmDay ?? 10000,
              feePerKmNight: c.feePerKmNight ?? 13000,
              minFee: c.minFee ?? 30000,
              freeKm: c.freeKm ?? 0,
              nightStartHour: c.nightStartHour ?? 22,
              nightStartMinute: c.nightStartMinute ?? 0,
              nightEndHour: c.nightEndHour ?? 6,
              nightEndMinute: c.nightEndMinute ?? 0,
              holidaySurgeEnabled: c.holidaySurgeEnabled ?? false,
              holidaySurchargePct: c.holidaySurchargePct || 20,
              displayNote: c.displayNote || '',
            };
          }
        });
        setConfigs(next);
      }

      if (dispatchRes.status === 'fulfilled' && dispatchRes.value?.data) {
        const dc = dispatchRes.value.data;
        setDispatchConfig({
          weightDistance: dc.weightDistance ?? 40,
          weightWorkload: dc.weightWorkload ?? 30,
          weightRating: dc.weightRating ?? 20,
          weightResponseRate: dc.weightResponseRate ?? 10,
          penaltyPerOrder: dc.penaltyPerOrder ?? 10,
        });
      }
    } catch (err: any) {
      console.error('Lỗi tải cấu hình hệ thống:', err);
      setErrorMsg('Không thể tải cấu hình từ máy chủ. Đang dùng cấu hình mặc định.');
    } finally {
      setLoading(false);
    }
  };

  const pricingTabKey: 'CAR' | 'MOTORBIKE' = activeTab === 'CAR' ? 'CAR' : 'MOTORBIKE';
  const currentConfig = configs[pricingTabKey];

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
      [pricingTabKey]: {
        ...prev[pricingTabKey],
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
      [pricingTabKey]: {
        ...prev[pricingTabKey],
        [field]: value,
      },
    }));
    setSuccessMsg(null);
  };

  const handleToggleHolidaySurge = () => {
    const nextVal = !currentConfig.holidaySurgeEnabled;
    setConfigs(prev => ({
      ...prev,
      [pricingTabKey]: {
        ...prev[pricingTabKey],
        holidaySurgeEnabled: nextVal,
        holidaySurchargePct: nextVal && (!prev[pricingTabKey].holidaySurchargePct || prev[pricingTabKey].holidaySurchargePct === 0)
          ? 20
          : prev[pricingTabKey].holidaySurchargePct,
      },
    }));
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Chuẩn hoá kiểu số trước khi gửi API
      const payload: RescuePricingConfigRequest = {
        ...currentConfig,
        baseKm: Number(currentConfig.baseKm) || 2.0,
        baseFareDay: Number(currentConfig.baseFareDay) || 30000,
        baseFareNight: Number(currentConfig.baseFareNight) || 40000,
        kmTier2Limit: Number(currentConfig.kmTier2Limit) || 10.0,
        feePerKmTier2Day: Number(currentConfig.feePerKmTier2Day) || 10000,
        feePerKmTier2Night: Number(currentConfig.feePerKmTier2Night) || 13000,
        feePerKmTier3Day: Number(currentConfig.feePerKmTier3Day) || 7000,
        feePerKmTier3Night: Number(currentConfig.feePerKmTier3Night) || 9000,
        feePerKmDay: Number(currentConfig.feePerKmTier2Day) || 10000,
        feePerKmNight: Number(currentConfig.feePerKmTier2Night) || 13000,
        minFee: Number(currentConfig.baseFareDay) || 30000,
      };

      await pricingConfigApi.updateConfig(activeTab as 'MOTORBIKE' | 'CAR', payload);
      setSuccessMsg(`Đã lưu cấu hình biểu phí cho ${activeTab === 'MOTORBIKE' ? 'Xe máy' : 'Ô tô'} thành công!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Lỗi lưu biểu phí:', err);
      setErrorMsg(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const totalDispatchWeight =
    (Number(dispatchConfig.weightDistance) || 0) +
    (Number(dispatchConfig.weightWorkload) || 0) +
    (Number(dispatchConfig.weightRating) || 0) +
    (Number(dispatchConfig.weightResponseRate) || 0);

  const handleSaveDispatch = async () => {
    if (totalDispatchWeight !== 100) {
      setErrorMsg(`Tổng các trọng số phải bằng đúng 100% (Hiện tại là ${totalDispatchWeight}%). Vui lòng điều chỉnh lại.`);
      return;
    }

    try {
      setSavingDispatch(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      await dispatchConfigApi.updateConfig({
        weightDistance: Number(dispatchConfig.weightDistance) || 0,
        weightWorkload: Number(dispatchConfig.weightWorkload) || 0,
        weightRating: Number(dispatchConfig.weightRating) || 0,
        weightResponseRate: Number(dispatchConfig.weightResponseRate) || 0,
        penaltyPerOrder: Number(dispatchConfig.penaltyPerOrder) || 10,
      });
      setSuccessMsg('Đã lưu cấu hình thuật toán điều phối đa tiêu chí thành công!');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Lỗi lưu cấu hình điều phối:', err);
      setErrorMsg(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu cấu hình điều phối.');
    } finally {
      setSavingDispatch(false);
    }
  };

  // Live Simulation for Dispatch Scoring (Kéo 4 tiêu chí tính điểm ưu tiên)
  const calculateDispatchSim = () => {
    const wDist = (Number(dispatchConfig.weightDistance) || 0) / 100.0;
    const wWorkload = (Number(dispatchConfig.weightWorkload) || 0) / 100.0;
    const wRating = (Number(dispatchConfig.weightRating) || 0) / 100.0;
    const wResp = (Number(dispatchConfig.weightResponseRate) || 0) / 100.0;
    const penalty = Number(dispatchConfig.penaltyPerOrder) || 10;

    // 1. Điểm cự ly di chuyển (Chuẩn cố định 50km: 100 * (1 - d / 50))
    const sDist = Math.max(0, 100 * (1 - simScoreDist / 50.0));
    const partDist = Number((wDist * sDist).toFixed(1));

    // 2. Điểm tải việc / San sẻ đơn: Max(0, 100 - Số đơn × Hệ số điều tiết)
    const sWork = Math.max(0, 100 - simScoreOrders * penalty);
    const partWork = Number((wWorkload * sWork).toFixed(1));

    // 3. Điểm uy tín đánh giá sao: (Rating / 5.0) × 100
    const sRating = (simScoreRating / 5.0) * 100;
    const partRating = Number((wRating * sRating).toFixed(1));

    // 4. Điểm chuyên cần / Tỷ lệ nhận đơn: responseRate %
    const sResp = simScoreRespRate;
    const partResp = Number((wResp * sResp).toFixed(1));

    // Tổng điểm ưu tiên điều phối
    const totalScore = Number((partDist + partWork + partRating + partResp).toFixed(1));

    return {
      sDist: Number(sDist.toFixed(1)),
      partDist,
      sWork: Math.round(sWork),
      partWork,
      sRating: Number(sRating.toFixed(1)),
      partRating,
      sResp: Math.round(sResp),
      partResp,
      totalScore,
    };
  };

  const dispatchSimResult = calculateDispatchSim();

  // Tính thử live theo thuật toán bậc thang cộng dồn
  const calculateSimBreakdown = () => {
    const baseKm = Number(currentConfig.baseKm) || 2.0;
    const baseFare = simIsNight ? (Number(currentConfig.baseFareNight) || 40000) : (Number(currentConfig.baseFareDay) || 30000);

    const tier2Limit = Number(currentConfig.kmTier2Limit) || 10.0;
    const rateTier2 = simIsNight ? (Number(currentConfig.feePerKmTier2Night) || 13000) : (Number(currentConfig.feePerKmTier2Day) || 10000);
    const rateTier3 = simIsNight ? (Number(currentConfig.feePerKmTier3Night) || 9000) : (Number(currentConfig.feePerKmTier3Day) || 7000);

    let tier1Amount = baseFare;
    let tier2Km = 0;
    let tier2Amount = 0;
    let tier3Km = 0;
    let tier3Amount = 0;

    if (simDistance <= baseKm) {
      // Chỉ tính cước mở cửa
    } else if (simDistance <= tier2Limit) {
      tier2Km = Number((simDistance - baseKm).toFixed(1));
      tier2Amount = Math.round(tier2Km * rateTier2);
    } else {
      tier2Km = Number((tier2Limit - baseKm).toFixed(1));
      tier2Amount = Math.round(tier2Km * rateTier2);

      tier3Km = Number((simDistance - tier2Limit).toFixed(1));
      tier3Amount = Math.round(tier3Km * rateTier3);
    }

    let subTotal = tier1Amount + tier2Amount + tier3Amount;
    let holidayAmount = 0;
    if (currentConfig.holidaySurgeEnabled && currentConfig.holidaySurchargePct > 0) {
      holidayAmount = Math.round(subTotal * (currentConfig.holidaySurchargePct / 100));
    }

    const finalFee = Math.round((subTotal + holidayAmount) / 1000) * 1000;

    return {
      baseKm,
      baseFare,
      tier1Amount,
      tier2Km,
      tier2Amount,
      rateTier2,
      tier3Km,
      tier3Amount,
      rateTier3,
      tier2Limit,
      holidayAmount,
      finalFee,
    };
  };

  const simResult = calculateSimBreakdown();

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
            {activeTab === 'DISPATCH_SCORING'
              ? 'Cấu hình thuật toán điều phối đa tiêu chí: Cự ly, Công bằng tải việc hôm nay, Rating sao, Chuyên cần'
              : 'Quản lý biểu phí cứu hộ theo cự ly bậc thang, cước mở cửa, ban ngày / ban đêm và phụ phí'}
          </p>
        </div>

        <button
          onClick={activeTab === 'DISPATCH_SCORING' ? handleSaveDispatch : handleSave}
          disabled={activeTab === 'DISPATCH_SCORING' ? (savingDispatch || totalDispatchWeight !== 100) : saving}
          title={activeTab === 'DISPATCH_SCORING' && totalDispatchWeight !== 100 ? `Tổng trọng số hiện là ${totalDispatchWeight}%. Bạn phải điều chỉnh vừa đúng 100% mới có thể lưu cài đặt.` : undefined}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving || savingDispatch ? (
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

      {/* Tabs chuyển loại cấu hình */}
      <div className="flex flex-col sm:flex-row border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-sm border gap-1">
        <button
          onClick={() => {
            setActiveTab('MOTORBIKE');
            setSuccessMsg(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'MOTORBIKE'
            ? 'bg-orange-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <Bike className="w-5 h-5" />
          <span>Biểu phí Xe Máy</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('CAR');
            setSuccessMsg(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'CAR'
            ? 'bg-orange-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <Car className="w-5 h-5" />
          <span>Biểu phí Ô Tô</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('DISPATCH_SCORING');
            setSuccessMsg(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'DISPATCH_SCORING'
            ? 'bg-orange-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <Scale className="w-5 h-5" />
          <span>Thuật Toán Điều Phối Công Bằng</span>
        </button>
      </div>

      {activeTab === 'DISPATCH_SCORING' ? (
        /* Giao diện Cấu hình Thuật toán Điều phối Đa tiêu chí (WSM) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái (7 cols): Cấu hình 4 trọng số & Tham số phạt */}
          <div className="lg:col-span-7 space-y-6">

            {/* Thanh trạng thái tổng trọng số */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${totalDispatchWeight === 100
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs'
              : totalDispatchWeight < 100
                ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-2xs'
                : 'bg-rose-50/80 border-rose-300 text-rose-950 shadow-2xs'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shadow-xs shrink-0 ${totalDispatchWeight === 100
                  ? 'bg-emerald-500 text-white'
                  : totalDispatchWeight < 100
                    ? 'bg-amber-500 text-white'
                    : 'bg-rose-500 text-white'
                  }`}>
                  {totalDispatchWeight}%
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    {totalDispatchWeight === 100 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Tổng trọng số đạt chuẩn 100% (Hợp lệ để lưu)</span>
                      </>
                    ) : totalDispatchWeight < 100 ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Tổng trọng số đang thiếu: {totalDispatchWeight}% / 100% (Cần tăng thêm {100 - totalDispatchWeight}%)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Tổng trọng số đang vượt mức: {totalDispatchWeight}% / 100% (Cần giảm bớt {totalDispatchWeight - 100}%)</span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs opacity-85 mt-0.5">
                    {totalDispatchWeight === 100
                      ? 'Hệ thống đã sẵn sàng. Bạn có thể bấm "Lưu Cài Đặt" để áp dụng bộ trọng số này cho toàn hệ thống.'
                      : totalDispatchWeight < 100
                        ? `Vui lòng tăng thêm ${100 - totalDispatchWeight}% ở các thanh trượt bên dưới. Nút Lưu Cài Đặt chỉ mở khi tổng bằng đúng 100%.`
                        : `Vui lòng giảm bớt ${totalDispatchWeight - 100}% ở các thanh trượt bên dưới. Nút Lưu Cài Đặt chỉ mở khi tổng bằng đúng 100%.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Card: 4 Trọng số */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-orange-500" />
                  Thiết Lập 4 Trọng Số Phân Bổ (WSM)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mô hình Weighted Scoring Model chấm điểm từng gara theo thang điểm 100 rồi nhân với tỷ trọng.
                </p>
              </div>

              {/* Slider 1: Khoảng cách */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-sm text-gray-900">Trọng số Khoảng cách (Cự ly Goong)</span>
                      <p className="text-[11px] text-gray-500">Ưu tiên gara gần hiện trường để giảm thiểu thời gian tiếp cận khách (ETA)</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-white text-orange-600 border border-orange-200/80 font-mono shadow-2xs">
                    {dispatchConfig.weightDistance}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={dispatchConfig.weightDistance}
                  onChange={(e) => {
                    setDispatchConfig(prev => ({ ...prev, weightDistance: Number(e.target.value) }));
                    setSuccessMsg(null);
                  }}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>0% (Bỏ qua cự ly)</span>
                  <span>100% (Thuần theo khoảng cách)</span>
                </div>

                {/* Nút bấm nhấn vào mới hiện ra chi tiết */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleDetail('distance')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-orange-600 bg-white hover:bg-orange-50/60 border border-gray-200 hover:border-orange-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-orange-500" />
                    <span>{expandedDetails['distance'] ? 'Thu gọn chi tiết' : 'Xem chi tiết cách tính điểm'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedDetails['distance'] ? 'rotate-180 text-orange-500' : 'text-gray-400'}`} />
                  </button>
                </div>

                {/* Box giải thích rõ cách tính */}
                {expandedDetails['distance'] && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1.5 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                        Cách tính điểm cự ly S_dist (Thang điểm 100):
                      </span>
                      <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-gray-200">
                        S_dist = Max(0, 100 - Khoảng_cách × 2)
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      • <strong>Quy tắc duy nhất:</strong> Chuẩn hóa theo bán kính cứu hộ tối đa toàn hệ thống là <strong>50 km</strong>. Cứ mỗi 1 km cách xa hiện trường, điểm cự ly bị trừ đúng <strong>2 điểm</strong> (100 / 50 = 2 đ/km).<br />
                      • <strong>Ví dụ:</strong> Cách 0.8 km = <strong>98.4 đ</strong> | Cách 2.2 km = <strong>95.6 đ</strong> | Cách 15 km = <strong>70.0 đ</strong> | Cách 30 km = <strong>40.0 đ</strong> | Từ 50 km trở lên = <strong>0 đ</strong>.<br />
                    </p>
                  </div>
                )}
              </div>

              {/* Slider 2: Khối lượng công việc hôm nay */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <span className="font-bold text-sm text-gray-900">Trọng số Khối lượng công việc (Công bằng tải việc)</span>
                      <p className="text-[11px] text-gray-500">
                        Ưu tiên gara chưa có đơn hôm nay, chống độc quyền gara gần "điểm đen" tai nạn
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-white text-orange-600 border border-orange-200/80 font-mono shadow-2xs">
                    {dispatchConfig.weightWorkload}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={dispatchConfig.weightWorkload}
                  onChange={(e) => {
                    setDispatchConfig(prev => ({ ...prev, weightWorkload: Number(e.target.value) }));
                    setSuccessMsg(null);
                  }}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>0% (Không điều tiết theo số đơn)</span>
                  <span>100% (Ưu tiên tuyệt đối gara vắng)</span>
                </div>

                {/* Nút bấm nhấn vào mới hiện ra chi tiết */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleDetail('workload')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-orange-600 bg-white hover:bg-orange-50/60 border border-gray-200 hover:border-orange-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-orange-500" />
                    <span>{expandedDetails['workload'] ? 'Thu gọn chi tiết' : 'Xem chi tiết cách tính điểm'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedDetails['workload'] ? 'rotate-180 text-orange-500' : 'text-gray-400'}`} />
                  </button>
                </div>

                {/* Box giải thích rõ cách tính */}
                {expandedDetails['workload'] && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1.5 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                        Cách tính điểm tải việc S_workload (Thang điểm 100):
                      </span>
                      <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-gray-200">
                        S_workload = Max(0, 100 - Số_đơn_hôm_nay × {dispatchConfig.penaltyPerOrder})
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      • <strong>Quy tắc:</strong> Đếm số đơn cứu hộ gara đã tiếp nhận từ 00:00 hôm nay. Mỗi đơn làm giảm mức ưu tiên <strong>{dispatchConfig.penaltyPerOrder} điểm</strong> (cấu hình bên dưới) để san sẻ đơn cho các gara lân cận còn rảnh.<br />
                      • <strong>Ví dụ:</strong> 0 đơn hôm nay = <strong>100 đ</strong> (Ưu tiên cao nhất) | 1 đơn = <strong>{Math.max(0, 100 - dispatchConfig.penaltyPerOrder)} đ</strong> | 2 đơn = <strong>{Math.max(0, 100 - 2 * dispatchConfig.penaltyPerOrder)} đ</strong> | 3 đơn = <strong>{Math.max(0, 100 - 3 * dispatchConfig.penaltyPerOrder)} đ</strong> | Từ {Math.ceil(100 / (dispatchConfig.penaltyPerOrder || 10))} đơn trở lên = <strong>0 đ</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Slider 3: Đánh giá chất lượng */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <span className="font-bold text-sm text-gray-900">Trọng số Đánh giá uy tín (Rating sao)</span>
                      <p className="text-[11px] text-gray-500">Ưu tiên gara được khách hàng đánh giá hài lòng cao (chuẩn hóa trên 5 sao)</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-white text-orange-600 border border-orange-200/80 font-mono shadow-2xs">
                    {dispatchConfig.weightRating}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={dispatchConfig.weightRating}
                  onChange={(e) => {
                    setDispatchConfig(prev => ({ ...prev, weightRating: Number(e.target.value) }));
                    setSuccessMsg(null);
                  }}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>0%</span>
                  <span>100%</span>
                </div>

                {/* Nút bấm nhấn vào mới hiện ra chi tiết */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleDetail('rating')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-orange-600 bg-white hover:bg-orange-50/60 border border-gray-200 hover:border-orange-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-orange-500" />
                    <span>{expandedDetails['rating'] ? 'Thu gọn chi tiết' : 'Xem chi tiết cách tính điểm'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedDetails['rating'] ? 'rotate-180 text-orange-500' : 'text-gray-400'}`} />
                  </button>
                </div>

                {/* Box giải thích rõ cách tính */}
                {expandedDetails['rating'] && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1.5 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                        Cách tính điểm đánh giá S_rating (Thang điểm 100):
                      </span>
                      <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-gray-200">
                        S_rating = (Rating_sao / 5.0) × 100
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      • <strong>Quy tắc:</strong> Chuẩn hóa điểm sao trung bình từ đánh giá khách hàng về thang điểm 100. Đối với gara mới chưa có đánh giá, hệ thống tự động gán điểm bằng <strong>trung bình sao của tất cả các gara trong hệ thống</strong> để đảm bảo công bằng và tạo cơ hội nhận đơn ban đầu.<br />
                      • <strong>Ví dụ:</strong> Nếu điểm trung bình hệ thống là 4.3★ thì gara mới nhận <strong>4.3★ (86.0 đ)</strong> | 5.0★ = <strong>100 đ</strong> | 4.8★ = <strong>96.0 đ</strong> | 4.0★ = <strong>80.0 đ</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Slider 4: Tỷ lệ phản hồi & nhận đơn */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50/70 border border-gray-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <span className="font-bold text-sm text-gray-900">Trọng số Tỷ lệ nhận đơn (Chuyên cần 30 ngày)</span>
                      <p className="text-[11px] text-gray-500">Ưu tiên gara tích cực nhận đơn cứu hộ, hạn chế bỏ lỡ hoặc từ chối</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold px-2.5 py-1 rounded-lg bg-white text-orange-600 border border-orange-200/80 font-mono shadow-2xs">
                    {dispatchConfig.weightResponseRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={dispatchConfig.weightResponseRate}
                  onChange={(e) => {
                    setDispatchConfig(prev => ({ ...prev, weightResponseRate: Number(e.target.value) }));
                    setSuccessMsg(null);
                  }}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>0%</span>
                  <span>100%</span>
                </div>

                {/* Nút bấm nhấn vào mới hiện ra chi tiết */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toggleDetail('responseRate')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-orange-600 bg-white hover:bg-orange-50/60 border border-gray-200 hover:border-orange-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-orange-500" />
                    <span>{expandedDetails['responseRate'] ? 'Thu gọn chi tiết' : 'Xem chi tiết cách tính điểm'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedDetails['responseRate'] ? 'rotate-180 text-orange-500' : 'text-gray-400'}`} />
                  </button>
                </div>

                {/* Box giải thích rõ cách tính */}
                {expandedDetails['responseRate'] && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs space-y-1.5 shadow-2xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                        Cách tính điểm chuyên cần S_resp (Thang điểm 100):
                      </span>
                      <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-gray-200">
                        S_resp = (Số_đơn_nhận / Tổng_lần_nổ_đơn_30_ngày) × 100
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      • <strong>Quy tắc:</strong> Tỷ lệ phần trăm gara bấm nhận đơn khi hệ thống gửi đề nghị trong 30 ngày qua. Gara mới nhận mặc định <strong>100 đ</strong>.<br />
                      • <strong>Ví dụ:</strong> Nhận 19/20 lần = <strong>95.0 đ</strong> | Nhận 100% = <strong>100 đ</strong> | Nhận 7/10 lần = <strong>70.0 đ</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card: Tham số Điều tiết Tải việc */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900">
                  Hệ Số Điều Tiết Tải Việc (San Sẻ Đơn Trong Ngày)
                </h2>
                <p className="text-xs text-gray-500">
                  Nhằm san sẻ cơ hội cứu hộ công bằng và chống quá tải cho thợ, mỗi đơn gara đã tiếp nhận hôm nay sẽ làm giảm dần mức ưu tiên theo công thức: Max(0, 100 - Số đơn × Hệ số điều tiết).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Mức giảm ưu tiên cho mỗi đơn đã tiếp nhận hôm nay
                  </label>
                  <IntegerInput
                    value={dispatchConfig.penaltyPerOrder}
                    onChange={(val) => {
                      setDispatchConfig(prev => ({ ...prev, penaltyPerOrder: val }));
                      setSuccessMsg(null);
                    }}
                    onBlurDefault={10}
                    min={0}
                    max={50}
                    suffix="điểm / đơn"
                    placeholder="10"
                    className="focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-gray-800">
                    <Info className="w-3.5 h-3.5 text-orange-500" />
                    Minh họa mức ưu tiên tiếp nhận theo hệ số {dispatchConfig.penaltyPerOrder}đ:
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-600">
                    <div>• 0 đơn hôm nay: <strong>100 điểm</strong></div>
                    <div>• 1 đơn hôm nay: <strong>{Math.max(0, 100 - 1 * dispatchConfig.penaltyPerOrder)} điểm</strong></div>
                    <div>• 2 đơn hôm nay: <strong>{Math.max(0, 100 - 2 * dispatchConfig.penaltyPerOrder)} điểm</strong></div>
                    <div>• 3 đơn hôm nay: <strong>{Math.max(0, 100 - 3 * dispatchConfig.penaltyPerOrder)} điểm</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải (5 cols): Live Simulator Kéo 4 Tiêu Chí Tính Điểm Ưu Tiên */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-md space-y-5">

              {/* Header Simulator */}
              <div className="flex items-center gap-2 border-b border-gray-700/60 pb-3">
                <Sliders className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold">Mô Phỏng Trực Tiếp</h3>
              </div>

              {/* 4 Thanh Trượt Điều Chỉnh (Sliders) */}
              <div className="space-y-4 pt-1">
                {/* 1. Kéo Cự Ly */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-gray-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      Cự ly di chuyển đến hiện trường:
                    </span>
                    <span className="text-white font-bold font-mono text-sm">{simScoreDist} km</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={simScoreDist}
                    onChange={(e) => setSimScoreDist(Number(e.target.value))}
                    className="w-full accent-orange-500 bg-gray-700 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>0 km</span>
                    <span className="font-mono text-gray-400">Điểm gốc: <strong className="text-white">{dispatchSimResult.sDist} đ</strong></span>
                    <span>50 km (0 đ)</span>
                  </div>
                </div>

                {/* 2. Kéo Đơn Hôm Nay */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-gray-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                      Số đơn đã tiếp nhận hôm nay:
                    </span>
                    <span className="text-white font-bold font-mono text-sm">{simScoreOrders} đơn</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={simScoreOrders}
                    onChange={(e) => setSimScoreOrders(Number(e.target.value))}
                    className="w-full accent-orange-500 bg-gray-700 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>0 đơn (Mới)</span>
                    <span className="font-mono text-gray-400">Điểm gốc: <strong className="text-white">{dispatchSimResult.sWork} đ</strong></span>
                    <span>20 đơn</span>
                  </div>
                </div>

                {/* 3. Kéo Đánh Giá Sao */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-gray-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-gray-400" />
                      Đánh giá uy tín (Rating sao):
                    </span>
                    <span className="text-white font-bold font-mono text-sm">{simScoreRating.toFixed(1)} ★</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5.0"
                    step="0.1"
                    value={simScoreRating}
                    onChange={(e) => setSimScoreRating(Number(e.target.value))}
                    className="w-full accent-orange-500 bg-gray-700 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>0 ★</span>
                    <span className="font-mono text-gray-400">Điểm gốc: <strong className="text-white">{dispatchSimResult.sRating} đ</strong></span>
                    <span>5.0 ★ (100 đ)</span>
                  </div>
                </div>

                {/* 4. Kéo Tỷ Lệ Nhận Đơn */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-gray-300 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-gray-400" />
                      Tỷ lệ nhận đơn (Chuyên cần 30 ngày):
                    </span>
                    <span className="text-white font-bold font-mono text-sm">{simScoreRespRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={simScoreRespRate}
                    onChange={(e) => setSimScoreRespRate(Number(e.target.value))}
                    className="w-full accent-orange-500 bg-gray-700 rounded-lg cursor-pointer h-2"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>0%</span>
                    <span className="font-mono text-gray-400">Điểm gốc: <strong className="text-white">{dispatchSimResult.sResp} đ</strong></span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Card Kết Quả Điểm Ưu Tiên */}
              <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Điểm Ưu Tiên Tổng Hợp:
                  </span>
                  <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${dispatchSimResult.totalScore >= 80
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : dispatchSimResult.totalScore >= 60
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                    }`}>
                    {dispatchSimResult.totalScore >= 80
                      ? '🟢 ƯU TIÊN RẤT CAO'
                      : dispatchSimResult.totalScore >= 60
                        ? '🟡 ƯU TIÊN TRUNG BÌNH'
                        : '🔴 ƯU TIÊN THẤP'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-orange-400 font-mono">
                    {dispatchSimResult.totalScore}
                  </span>
                  <span className="text-sm font-semibold text-gray-400">/ 100 điểm</span>
                </div>

                {/* Thanh đo tiến trình trực quan */}
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden border border-gray-700/60">
                  <div
                    className="h-full rounded-full transition-all duration-200 bg-orange-500"
                    style={{ width: `${Math.min(100, Math.max(0, dispatchSimResult.totalScore))}%` }}
                  />
                </div>

                {/* Bóc tách điểm số đóng góp của từng tiêu chí */}
                <div className="space-y-1.5 text-xs text-gray-300 border-t border-gray-700/60 pt-2.5 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">• Cự ly ({simScoreDist}km):</span>
                    <span>{dispatchSimResult.sDist}đ × {dispatchConfig.weightDistance}% = <strong className="text-white font-mono font-bold">+{dispatchSimResult.partDist}đ</strong></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">• Đơn hôm nay ({simScoreOrders} đơn):</span>
                    <span>{dispatchSimResult.sWork}đ × {dispatchConfig.weightWorkload}% = <strong className="text-white font-mono font-bold">+{dispatchSimResult.partWork}đ</strong></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">• Đánh giá sao ({simScoreRating.toFixed(1)}★):</span>
                    <span>{dispatchSimResult.sRating}đ × {dispatchConfig.weightRating}% = <strong className="text-white font-mono font-bold">+{dispatchSimResult.partRating}đ</strong></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">• Nhận đơn 30 ngày ({simScoreRespRate}%):</span>
                    <span>{dispatchSimResult.sResp}đ × {dispatchConfig.weightResponseRate}% = <strong className="text-white font-mono font-bold">+{dispatchSimResult.partResp}đ</strong></span>
                  </div>
                </div>
              </div>

              {/* Giải thích thuật toán */}
              <div className="text-[11px] text-gray-400 space-y-1.5 border-t border-gray-700/60 pt-3">
                <div className="font-semibold text-gray-300">📐 Công thức tính điểm ưu tiên:</div>
                <div className="font-mono bg-gray-900/80 p-2.5 rounded-lg border border-gray-700/60 text-[10px] text-orange-300 overflow-x-auto leading-relaxed">
                  Score = ({dispatchConfig.weightDistance}% × S_cự_ly) + ({dispatchConfig.weightWorkload}% × S_tải_việc) + ({dispatchConfig.weightRating}% × S_sao) + ({dispatchConfig.weightResponseRate}% × S_chuyên_cần)
                </div>
                <p className="text-[11px] text-gray-400 italic">
                  💡 Hệ thống tự động phát cuốc cứu hộ cho gara đạt <strong>Điểm Ưu Tiên cao nhất</strong> trong bán kính quét tại thời điểm xảy ra sự cố.
                </p>
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* Layout Grid: Form Cài đặt & Bảng Live Simulator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Form cấu hình 3 bậc */}
          <div className="lg:col-span-7 space-y-6">

            {/* Card 1: Bậc 1 - Cước mở cửa */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Bậc 1: Cước Mở Cửa (Khởi Điểm)
                    </h2>
                    <p className="text-xs text-gray-500">Khoản phí trọn gói ban đầu bảo đảm công xuất phát của thợ</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                  {currentConfig.baseKm || 2} km đầu tiên
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Cự ly mở cửa
                  </label>
                  <KmInput
                    value={currentConfig.baseKm}
                    onChange={(val) => handleFieldChange('baseKm', val)}
                    onBlurDefault={2.0}
                    placeholder="2"
                    className="focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Cự ly cố định ban đầu</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    ☀️ Ban ngày
                  </label>
                  <MoneyInput
                    value={currentConfig.baseFareDay}
                    onChange={(val) => handleFieldChange('baseFareDay', val)}
                    placeholder="30.000"
                    suffix="VNĐ"
                    className="focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Cước mở cửa ban ngày</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    🌙 Ban đêm
                  </label>
                  <MoneyInput
                    value={currentConfig.baseFareNight}
                    onChange={(val) => handleFieldChange('baseFareNight', val)}
                    placeholder="40.000"
                    suffix="VNĐ"
                    className="focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Cước mở cửa ban đêm</p>
                </div>
              </div>
            </div>

            {/* Card 2: Bậc 2 - Cự ly chuẩn */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                    2
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Bậc 2: Cự Ly Tiêu Chuẩn ({currentConfig.baseKm || 2} km – {currentConfig.kmTier2Limit || 10} km)
                    </h2>
                    <p className="text-xs text-gray-500">Đơn giá km áp dụng trong bán kính phục vụ trung bình</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  Tối đa {currentConfig.kmTier2Limit || 10} km
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Ngưỡng hết Bậc 2
                  </label>
                  <KmInput
                    value={currentConfig.kmTier2Limit}
                    onChange={(val) => handleFieldChange('kmTier2Limit', val)}
                    onBlurDefault={10.0}
                    placeholder="10"
                    className="focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Hết mốc này sẽ sang Bậc 3</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    ☀️ Ban ngày
                  </label>
                  <MoneyInput
                    value={currentConfig.feePerKmTier2Day}
                    onChange={(val) => handleFieldChange('feePerKmTier2Day', val)}
                    placeholder="10.000"
                    suffix="đ / km"
                    className="focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Đơn giá km ban ngày</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    🌙 Ban đêm
                  </label>
                  <MoneyInput
                    value={currentConfig.feePerKmTier2Night}
                    onChange={(val) => handleFieldChange('feePerKmTier2Night', val)}
                    placeholder="13.000"
                    suffix="đ / km"
                    className="focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Đơn giá km ban đêm</p>
                </div>
              </div>
            </div>

            {/* Card 3: Bậc 3 - Cự ly xa */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">
                    3
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      Bậc 3: Cự Ly Đường Dài (Trên {currentConfig.kmTier2Limit || 10} km)
                    </h2>
                    <p className="text-xs text-gray-500">Đơn giá ưu đãi giảm dần để cuốc đường dài không bị quá đắt</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  Lũy thoái đường dài
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    ☀️ Ban ngày (&gt; {currentConfig.kmTier2Limit || 10} km)
                  </label>
                  <MoneyInput
                    value={currentConfig.feePerKmTier3Day}
                    onChange={(val) => handleFieldChange('feePerKmTier3Day', val)}
                    placeholder="7.000"
                    suffix="đ / km"
                    className="focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Đơn giá km đường dài ban ngày</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    🌙 Ban đêm (&gt; {currentConfig.kmTier2Limit || 10} km)
                  </label>
                  <MoneyInput
                    value={currentConfig.feePerKmTier3Night}
                    onChange={(val) => handleFieldChange('feePerKmTier3Night', val)}
                    placeholder="9.000"
                    suffix="đ / km"
                    className="focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Đơn giá km đường dài ban đêm</p>
                </div>
              </div>
            </div>

            {/* Card 4: Khung giờ & Phụ phí lễ */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Clock className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-bold text-gray-900">
                  4. Khung Giờ Ban Đêm & Phụ Phí Dịp Lễ
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

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleHolidaySurge}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer ${currentConfig.holidaySurgeEnabled ? 'bg-amber-500' : 'bg-gray-300'
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
                          type="text"
                          inputMode="numeric"
                          disabled={!currentConfig.holidaySurgeEnabled}
                          value={currentConfig.holidaySurchargePct === 0 ? '' : currentConfig.holidaySurchargePct}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            handleFieldChange('holidaySurchargePct', digits ? Math.min(100, Math.max(0, Number(digits))) : 0);
                          }}
                          className={`w-full pl-2 pr-6 py-1.5 border rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${currentConfig.holidaySurgeEnabled
                            ? 'bg-white border-amber-300 text-gray-900'
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          placeholder="20"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none select-none">%</span>
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

          {/* Cột phải: Live Preview & Mô phỏng bóc tách */}
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
                  <span>Khoảng cách di chuyển Goong thực tế:</span>
                  <span className="text-orange-400 font-bold text-sm">{simDistance} km</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="30"
                  step="0.5"
                  value={simDistance}
                  onChange={(e) => setSimDistance(Number(e.target.value))}
                  className="w-full accent-orange-500 bg-gray-700 rounded-lg cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0.5 km</span>
                  <span>15 km</span>
                  <span>30 km</span>
                </div>
              </div>

              {/* Toggle ngày / đêm */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-800/80 rounded-xl border border-gray-700">
                <button
                  type="button"
                  onClick={() => setSimIsNight(false)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${!simIsNight
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
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${simIsNight
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Ban đêm</span>
                </button>
              </div>

              {/* Bóc tách kết quả tính từng bậc */}
              <div className="bg-gray-800/90 rounded-xl p-4 border border-gray-700/60 space-y-2.5">
                <div className="flex justify-between text-xs text-gray-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-500/30 text-orange-300 inline-flex items-center justify-center text-[10px] font-bold">1</span>
                    Cước mở cửa ({simResult.baseKm}km đầu):
                  </span>
                  <span className="font-semibold text-white">{formatVnd(simResult.tier1Amount)}</span>
                </div>

                {simResult.tier2Km > 0 && (
                  <div className="flex justify-between text-xs text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 inline-flex items-center justify-center text-[10px] font-bold">2</span>
                      Bậc 2 ({simResult.tier2Km}km × {formatVnd(simResult.rateTier2)}):
                    </span>
                    <span className="font-semibold text-white">+{formatVnd(simResult.tier2Amount)}</span>
                  </div>
                )}

                {simResult.tier3Km > 0 && (
                  <div className="flex justify-between text-xs text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-300 inline-flex items-center justify-center text-[10px] font-bold">3</span>
                      Bậc 3 ({simResult.tier3Km}km × {formatVnd(simResult.rateTier3)}):
                    </span>
                    <span className="font-semibold text-white">+{formatVnd(simResult.tier3Amount)}</span>
                  </div>
                )}

                {simResult.holidayAmount > 0 && (
                  <div className="flex justify-between text-xs text-amber-300">
                    <span>Phụ phí lễ (+{currentConfig.holidaySurchargePct}%):</span>
                    <span className="font-semibold text-amber-400">+{formatVnd(simResult.holidayAmount)}</span>
                  </div>
                )}

                <div className="border-t border-gray-700 pt-2.5 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs text-gray-300 font-semibold block">Tổng phí di chuyển ①:</span>
                    <span className="text-[10px] text-gray-400">Làm tròn tới nghìn đồng</span>
                  </div>
                  <span className="text-2xl font-black text-orange-400">
                    {formatVnd(simResult.finalFee)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 italic">
                💡 Đây là số tiền hiển thị trên popup nổ đơn cho Gara và là <strong>khoản phí tối thiểu</strong> khách hàng phải thanh toán khi nhân viên đến hiện trường.
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
                  <strong className="text-orange-900 block mb-0.5">① Phí di chuyển (Biểu phí bậc thang trên)</strong>
                  Hệ thống tự động tính theo km đường bộ Goong. Khách <strong>bắt buộc phải thanh toán</strong> kể cả khi từ chối sửa chữa hay từ chối kéo xe.
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
      )}
    </div>
  );
}
