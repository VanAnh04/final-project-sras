import { RescueRequestDto } from '../api/rescueApi';

/**
 * Ước lượng phí di chuyển cứu hộ theo biểu phí bậc thang khi backend chưa trả `rescueFee`.
 * Công thức:
 *  - Bậc 1: Cước mở cửa (2km đầu): Xe máy 30.000đ (đêm 40.000đ), Ô tô 60.000đ (đêm 80.000đ)
 *  - Bậc 2: 2km - 10km: Xe máy 10.000đ/km (đêm 13.000đ), Ô tô 20.000đ/km (đêm 25.000đ)
 *  - Bậc 3: > 10km: Xe máy 7.000đ/km (đêm 9.000đ), Ô tô 15.000đ/km (đêm 18.000đ)
 */
export function estimateRescueFee(vehicleType?: string, distanceKm?: number | null, testHour?: number): number {
  const isCar = vehicleType === 'CAR';
  const hour = testHour !== undefined ? testHour : new Date().getHours();
  const isNight = hour >= 22 || hour < 6;

  const baseKm = 2.0;
  const baseFare = isCar ? (isNight ? 80000 : 60000) : (isNight ? 40000 : 30000);
  const tier2Limit = 10.0;
  const rateTier2 = isCar ? (isNight ? 25000 : 20000) : (isNight ? 13000 : 10000);
  const rateTier3 = isCar ? (isNight ? 18000 : 15000) : (isNight ? 9000 : 7000);

  const d = distanceKm && distanceKm > 0 ? distanceKm : 0;
  let calculated = baseFare;

  if (d <= baseKm) {
    calculated = baseFare;
  } else if (d <= tier2Limit) {
    calculated = baseFare + (d - baseKm) * rateTier2;
  } else {
    calculated = baseFare + (tier2Limit - baseKm) * rateTier2 + (d - tier2Limit) * rateTier3;
  }

  const rounded = Math.round(calculated / 1000) * 1000;
  return Math.max(baseFare, rounded);
}

/** Phí hiển thị khách cần thanh toán: ưu tiên totalAmount (đã trừ cọc nếu có), nếu không thì rescueFee hoặc ước lượng. */
export function resolveRescueFee(req?: RescueRequestDto | null): number {
  if (!req) return 0;
  const hasPaidDeposit = Boolean(
    req.depositRequired &&
      (req.depositStatus === 'PAID' || req.depositStatus === 'TRANSFERRED_TO_GARAGE')
  );
  const depositDeduction = hasPaidDeposit ? (req.depositAmount || 50000) : 0;

  if (req.quoteStatus === 'DECLINED') {
    if (req.totalAmount != null && (req.totalAmount > 0 || hasPaidDeposit)) {
      return req.totalAmount;
    }
    if (req.rescueFee != null && req.rescueFee > 0) {
      return Math.max(0, req.rescueFee - depositDeduction);
    }
    return Math.max(0, estimateRescueFee(req.vehicleType, req.dispatchDistanceKm) - depositDeduction);
  }
  if (req.totalAmount != null && (req.totalAmount > 0 || hasPaidDeposit)) return req.totalAmount;
  if (req.rescueFee != null && req.rescueFee > 0) return Math.max(0, req.rescueFee - depositDeduction);
  return Math.max(0, estimateRescueFee(req.vehicleType, req.dispatchDistanceKm) - depositDeduction);
}

/** Định dạng VND kèm dấu chấm (Hermes không luôn hỗ trợ toLocaleString). */
export function formatVnd(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}
