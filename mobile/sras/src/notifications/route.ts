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
  const id = data.refType === 'RESCUE_REQUEST' ? str(data.refId) : undefined;

  // Tin nhắn mới và cuộc gọi nhỡ / cuộc gọi đã kết thúc đều mở chat với người gửi / người gọi.
  if (type === 'CHAT_MESSAGE' || type === 'INCOMING_CALL' || type === 'MISSED_CALL') {
    const requestId = str(data.rescueRequestId);
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

  switch (role) {
    case 'CUSTOMER':
      if (type === 'GARAGE_REVIEWED') return '/customer';
      if (!id) return null;
      if (type === 'NEW_QUOTE') return { pathname: '/customer/rescue-quote', params: { id } } as unknown as Href; // typed routes chưa sinh lại cho màn này
      if (type === 'PAYMENT_RECEIVED') return '/customer/activity';
      return { pathname: '/customer/rescue-tracking', params: { id } };

    case 'GARAGE_OWNER':
      // Kết quả rút tiền → lịch sử rút, mở sheet đúng lệnh.
      if (data.refType === 'WITHDRAWAL' && str(data.refId)) {
        return { pathname: '/garage-owner/withdrawals', params: { id: str(data.refId) } } as unknown as Href; // typed routes chưa sinh lại cho màn này
      }
      if (!id) return null;
      // Lời mời mới (chưa nhận) / đơn bị hủy → tab đơn hàng; còn lại (gồm tự động nhận) → chi tiết đơn.
      if (type === 'NEW_ORDER' || type === 'ORDER_CANCELLED') return '/garage-owner/orders';
      return { pathname: '/garage-owner/order-detail', params: { id } };

    case 'GARAGE_STAFF':
      if (type === 'QUOTE_RESPONDED' && id) return { pathname: '/garage-staff/repair-progress', params: { id } } as unknown as Href; // typed routes chưa sinh lại cho màn này
      if (!id) return null;
      return '/garage-staff/home';

    default:
      return null;
  }
}
