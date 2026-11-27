import type { Href } from 'expo-router';

/** Payload `data` backend gửi kèm push (xem NotificationServiceImpl / ChatServiceImpl). */
export type PushData = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined;

/**
 * Màn cần mở khi người dùng bấm vào push. Bảng ánh xạ khớp cột "Bấm vào mở" trong danh mục
 * thông báo (call-realtime.md / docs/business-rules.md). Trả về null nếu không cần điều hướng.
 */
export function routeForNotification(role: string | undefined, data: PushData): Href | null {
  const type = str(data.type);
  const id =
    data.refType === 'RESCUE_REQUEST' || data.rescueRequestId != null || data.requestId != null
      ? str(data.refId ?? data.rescueRequestId ?? data.requestId)
      : data.refType === 'WALLET' && data.refId != null
        ? str(data.refId)
        : undefined;

  // Tin nhắn mới và cuộc gọi nhỡ / cuộc gọi đã kết thúc đều mở chat với người gửi / người gọi.
  if (type === 'CHAT_MESSAGE' || type === 'INCOMING_CALL' || type === 'MISSED_CALL') {
    const requestId = str(data.rescueRequestId ?? data.requestId);
    const peer = str(data.peer);
    if (!requestId || !peer) return null;
    return {
      pathname: '/chat',
      params: {
        requestId,
        peer,
        peerName: str(data.peerName) ?? '',
        peerPhone: str(data.peerPhone) ?? '',
        peerAvatar: str(data.peerAvatar) ?? '',
      },
    };
  }

  // Thông báo xét duyệt hồ sơ Gara (Gửi hồ sơ, phê duyệt, từ chối) -> mở màn hình tiến độ / kết quả xét duyệt
  if (
    (data.refType === 'GARAGE' || type === 'GARAGE' || type === 'GARAGE_REVIEWED') &&
    data.refType !== 'RESCUE_REQUEST'
  ) {
    if (role === 'CUSTOMER' || !role) {
      return '/customer/register-partner';
    }
  }

  switch (role) {
    case 'CUSTOMER':
      if (
        type === 'GARAGE_REVIEWED' ||
        data.refType === 'GARAGE' ||
        data.type === 'GARAGE' ||
        data.type === 'GARAGE_REVIEWED'
      ) {
        return '/customer/register-partner';
      }
      // Cảnh báo cung đường rủi ro -> mở màn hình Thông báo
      if (type === 'ROAD_HAZARD_WARNING' || data.refType === 'ROAD_HAZARD') {
        return '/customer/notifications';
      }
      // Lời mời tham gia Gara -> mở trang chủ Khách hàng để hiện modal
      if (type === 'STAFF_INVITATION' || data.refType === 'STAFF_INVITATION') {
        return '/customer';
      }
      if (!id) return null;
      if (type === 'NEW_QUOTE') return { pathname: '/customer/rescue-quote', params: { id, from: '/customer/notifications' } } as unknown as Href;
      if (type === 'PAYMENT_RECEIVED' && data.refType !== 'RESCUE_REQUEST') return '/customer/activity';
      if (data.refType === 'RESCUE_REQUEST' || data.rescueRequestId != null || data.requestId != null) {
        return { pathname: '/customer/rescue-tracking', params: { id } };
      }
      return '/customer';

    case 'GARAGE_OWNER':
      // 1. Khi có mã đơn cứu hộ (tự động nhận, thu tiền mặt, bồi hoàn xăng xe, đánh giá sao, hủy đơn, v.v.),
      // nhấn vào thông báo luôn chuyển thẳng tới màn hình chi tiết của đơn cứu hộ đó.
      if (id && (data.refType === 'RESCUE_REQUEST' || data.rescueRequestId != null || data.requestId != null || type === 'NEW_ORDER' || type === 'ORDER_ACCEPTED' || type === 'ORDER_CANCELLED' || type === 'GARAGE_REVIEWED' || type === 'PAYMENT_RECEIVED')) {
        return { pathname: '/garage-owner/order-detail', params: { id, from: 'orders' } };
      }
      // 2. Kết quả rút tiền → lịch sử rút, mở sheet đúng lệnh.
      if (data.refType === 'WITHDRAWAL' && str(data.refId)) {
        return { pathname: '/garage-owner/withdrawals', params: { id: str(data.refId) } } as unknown as Href;
      }
      // 3. Thông báo liên quan đến Thợ / Kỹ thuật viên (lời mời gia nhập, thôi việc, v.v.)
      if (
        data.refType === 'GARAGE_STAFF' ||
        data.refType === 'STAFF_INVITATION' ||
        type === 'STAFF_INVITATION' ||
        type === 'STAFF_ASSIGNED' ||
        type === 'TASK_ASSIGNED'
      ) {
        return '/garage-owner/staff';
      }
      // 4. Cảnh báo Kho phụ tùng & Hết hàng / Sắp hết hàng
      if (
        data.refType === 'INVENTORY' ||
        type === 'INVENTORY' ||
        String(data.type).includes('INVENTORY')
      ) {
        return {
          pathname: '/garage-owner/inventory',
          params: {
            tab: 'STOCK',
            itemId: data.refId != null ? String(data.refId) : undefined,
            openAdjust: '1',
          },
        } as unknown as Href;
      }
      if (!id) {
        if (type === 'NEW_ORDER' || type === 'ORDER_CANCELLED' || type === 'ORDER_ACCEPTED') return '/garage-owner/orders';
        if (type === 'PAYMENT_RECEIVED' || type === 'WALLET_TOPUP') return '/garage-owner/wallet';
        return null;
      }
      return { pathname: '/garage-owner/order-detail', params: { id, from: 'orders' } };

    case 'GARAGE_STAFF':
      // Thông báo thôi việc hoặc thay đổi nhân sự Gara -> chuyển về giao diện Khách hàng
      if (
        data.refType === 'GARAGE_STAFF' ||
        data.refType === 'STAFF_INVITATION' ||
        type === 'STAFF_INVITATION' ||
        data.refType === 'GARAGE'
      ) {
        return '/customer';
      }

      // Xác nhận thu tiền mặt từ Chủ Gara hoặc ví thợ
      if (
        data.refType === 'CASH_SETTLEMENT' ||
        data.refType === 'WALLET' ||
        type === 'PAYMENT_SUCCESS'
      ) {
        return '/garage-staff/wallet';
      }

      if (type === 'QUOTE_RESPONDED' && id) return { pathname: '/garage-staff/repair-progress', params: { id } } as unknown as Href;
      if (!id) return '/garage-staff/home';
      return { pathname: '/garage-staff/order-detail', params: { id } };

    default:
      return null;
  }
}
