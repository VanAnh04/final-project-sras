import type { ChatPeer } from '../api/chatApi';

/**
 * Trạng thái đơn cho phép gọi thoại miễn phí — bản sao `CALLABLE` của backend (CallServiceImpl):
 * từ lúc gara nhận đơn đến lúc chờ thanh toán.
 */
export const CALLABLE_STATUSES: readonly string[] = [
  'ACCEPTED',
  'ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'DIAGNOSED',
  'REPAIRING_ONSITE',
  'TOWING',
  'COMPLETED',
  'AWAITING_PAYMENT',
];

export const canFreeCall = (status?: string | null): boolean =>
  !!status && CALLABLE_STATUSES.includes(status);

/** Nhãn hiển thị cho vai của đối phương trong cuộc gọi. */
export const PEER_LABEL: Record<ChatPeer, string> = {
  CUSTOMER: 'Khách hàng',
  GARAGE: 'Chủ gara',
  STAFF: 'Nhân viên cứu hộ',
};

/** Giây → "mm:ss" (phút có thể lớn hơn 59 với cuộc gọi dài). */
export const formatDuration = (sec: number): string => {
  const total = Math.max(0, Math.floor(sec));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};
