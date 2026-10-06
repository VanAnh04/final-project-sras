import { RescueRequestDto } from '../api/rescueApi';

/**
 * Ước lượng phí cứu hộ khi backend chưa trả `rescueFee`.
 * Công thức: phí mở cửa theo loại xe + phí quãng đường (theo km), làm tròn 5.000đ.
 *  - Xe máy:  mở cửa 50.000đ + 15.000đ/km
 *  - Ô tô:    mở cửa 100.000đ + 25.000đ/km
 */
export function estimateRescueFee(vehicleType?: string, distanceKm?: number | null): number {
  const isCar = vehicleType === 'CAR';
  const base = isCar ? 100000 : 50000;
  const perKm = isCar ? 25000 : 15000;
  const d = distanceKm && distanceKm > 0 ? distanceKm : 0;
  return Math.round((base + perKm * d) / 5000) * 5000;
}

/** Phí hiển thị: ưu tiên totalAmount (nếu có báo giá/hoàn thành), nếu không thì rescueFee hoặc ước lượng. */
export function resolveRescueFee(req?: RescueRequestDto | null): number {
  if (!req) return 0;
  if (req.totalAmount != null && req.totalAmount > 0) return req.totalAmount;
  if (req.rescueFee != null && req.rescueFee > 0) return req.rescueFee;
  return estimateRescueFee(req.vehicleType, req.dispatchDistanceKm);
}

/** Định dạng VND kèm dấu chấm (Hermes không luôn hỗ trợ toLocaleString). */
export function formatVnd(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
}
