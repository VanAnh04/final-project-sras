import type { BaseEntity } from './base';
import type { CallPartyRole, CallStatus } from './enums';

/** Nhật ký một cuộc gọi thoại trong app giữa hai người cùng một đơn cứu hộ (không lưu nội dung cuộc gọi). */
export interface CallSession extends BaseEntity {
  rescueRequestId: number;
  callerId: number;
  calleeId: number;
  callerRole: CallPartyRole;
  calleeRole: CallPartyRole;
  status: CallStatus;
  answeredAt: string | null;
  endedAt: string | null;
  /** Số giây nói chuyện; chỉ có khi cuộc gọi từng được nghe máy. */
  durationSec: number | null;
  /** Người bấm kết thúc; null = hệ thống (hết giờ đổ chuông, mất kết nối). */
  endedById: number | null;
}
