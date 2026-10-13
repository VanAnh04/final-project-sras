import { RescueRequestDto } from '../api/rescueApi';

/**
 * Ước lượng phí di chuyển cứu hộ khi backend chưa trả `rescueFee`.
 * Công thức: khoảng cách (km) × đơn giá theo loại xe, đảm bảo cước sàn tối thiểu.
 *  - Xe máy: 15.000đ/km, cước tối thiểu 30.000đ
 *  - Ô tô:   25.000đ/km, cước tối thiểu 50.000đ
 */
export function estimateRescueFee(vehicleType?: string, distanceKm?: number | null): number {
  const isCar = vehicleType === 'CAR';
  const minFee = isCar ? 50000 : 30000;
  const perKm = isCar ? 25000 : 15000;
  const d = distanceKm && distanceKm > 0 ? distanceKm : 0;
  const calculated = Math.round((perKm * d) / 1000) * 1000;
  return Math.max(minFee, calculated);
}

/** Phí hiển thị: ưu tiên totalAmount (nếu có báo giá/hoàn thành), nếu không thì rescueFee hoặc ước lượng. */
export function resolveRescueFee(req?: RescueRequestDto | null): number {
  if (!req) return 0;
  if (req.quoteStatus === 'DECLINED') {
    if (req.rescueFee != null && req.rescueFee > 0) return req.rescueFee;
    if (req.inspectionFee != null && req.inspectionFee > 0) return req.inspectionFee;
    return estimateRescueFee(req.vehicleType, req.dispatchDistanceKm);
  }
  if (req.totalAmount != null && req.totalAmount > 0) return req.totalAmount;
  if (req.rescueFee != null && req.rescueFee > 0) return req.rescueFee;
  return estimateRescueFee(req.vehicleType, req.dispatchDistanceKm);
}

/** Định dạng VND kèm dấu chấm (Hermes không luôn hỗ trợ toLocaleString). */
export function formatVnd(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}
