import { API_ORIGIN, getAccessToken } from '../api/axiosClient';
import type { ChatMessageDto, ChatPeer } from '../api/chatApi';
import type { CallDto, SignalType } from '../api/callApi';
import type { CallStatus } from '../models/enums';

/**
 * Kết nối WebSocket dùng chung cho chat realtime và báo hiệu cuộc gọi. Token đưa qua query param vì
 * React Native không set được header Authorization trên WebSocket. Tự reconnect (backoff) khi rớt.
 *
 * Định tuyến: mỗi màn chat subscribe theo (rescueId, peerRole). Với mỗi tin đến, peerRole được
 * suy ra theo góc nhìn "tôi" = phía KHÔNG phải mình trong tin nhắn. Sự kiện `CALL_*` đi một đường
 * riêng tới các handler đăng ký bằng `onCallEvent`.
 */

/** Sự kiện cuộc gọi server đẩy xuống (xem CallServiceImpl ở backend). */
export type CallSocketEvent =
  | { event: 'CALL_INCOMING'; call: CallDto }
  | { event: 'CALL_ACCEPTED'; callId: number }
  | { event: 'CALL_SIGNAL'; callId: number; type: SignalType; sdp: string }
  | { event: 'CALL_ENDED'; callId: number; status: CallStatus; durationSec?: number | null };

type MessageHandler = (msg: ChatMessageDto) => void;
type StatusHandler = (connected: boolean) => void;
type CallEventHandler = (ev: CallSocketEvent) => void;

const WS_URL_BASE = API_ORIGIN.replace(/^http/i, 'ws') + '/ws/chat';

/** Gói giữ kết nối: proxy/NAT hay cắt kết nối nhàn rỗi; server bỏ qua gói này. */
const HEARTBEAT_MS = 25000;

let ws: WebSocket | null = null;
let myUserId: number | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectAttempts = 0;
let wantConnected = false;

const messageSubs = new Map<string, Set<MessageHandler>>();
const statusSubs = new Set<StatusHandler>();
const callSubs = new Set<CallEventHandler>();

const keyOf = (rescueId: number, peer: ChatPeer) => `${rescueId}:${peer}`;

const notifyStatus = (connected: boolean) => {
  statusSubs.forEach((cb) => {
    try {
      cb(connected);
    } catch {}
  });
};

const clearReconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const startHeartbeat = () => {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send('{"event":"PING"}');
      } catch {}
    }
  }, HEARTBEAT_MS);
};

const scheduleReconnect = () => {
  if (!wantConnected || reconnectTimer) return;
  const delay = Math.min(15000, 1000 * 2 ** reconnectAttempts);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openSocket();
  }, delay);
};

const openSocket = () => {
  if (!wantConnected) return;
  const token = getAccessToken();
  if (!token) {
    // Chưa có token → thử lại sau, AuthContext sẽ set token khi refresh xong.
    scheduleReconnect();
    return;
  }
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(`${WS_URL_BASE}?token=${encodeURIComponent(token)}`);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempts = 0;
    startHeartbeat();
    notifyStatus(true);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(typeof event.data === 'string' ? event.data : '');
      if (typeof data?.event === 'string' && data.event.startsWith('CALL_')) {
        dispatchCallEvent(data as CallSocketEvent);
        return;
      }
      if (data?.event === 'CHAT_MESSAGE' && data.message) {
        dispatchMessage(data.message as ChatMessageDto);
      }
    } catch {}
  };

  ws.onerror = () => {
    // onclose sẽ lo reconnect.
  };

  ws.onclose = () => {
    stopHeartbeat();
    notifyStatus(false);
    ws = null;
    scheduleReconnect();
  };
};

const globalSubs = new Set<(msg?: ChatMessageDto) => void>();

const dispatchCallEvent = (ev: CallSocketEvent) => {
  callSubs.forEach((cb) => {
    try {
      cb(ev);
    } catch {}
  });
};

const dispatchMessage = (msg: ChatMessageDto) => {
  // Báo cho các global listeners (inbox, badge count)
  globalSubs.forEach((cb) => {
    try {
      cb(msg);
    } catch {}
  });

  // peerRole = phía không phải "tôi".
  const peerRole: ChatPeer =
    myUserId != null && msg.senderId === myUserId ? msg.recipientRole : msg.senderRole;
  
  const rolesToNotify: ChatPeer[] = [peerRole];
  if (peerRole === 'STAFF') rolesToNotify.push('GARAGE');
  else if (peerRole === 'GARAGE') rolesToNotify.push('STAFF');

  const dispatched = new Set<MessageHandler>();
  rolesToNotify.forEach((r) => {
    const subs = messageSubs.get(keyOf(msg.rescueRequestId, r));
    if (subs) {
      subs.forEach((h) => {
        if (!dispatched.has(h)) {
          dispatched.add(h);
          try {
            h(msg);
          } catch {}
        }
      });
    }
  });
};

export const chatSocket = {
  /** Bật kết nối cho user đã đăng nhập (idempotent). */
  connect(userId: number) {
    myUserId = userId;
    wantConnected = true;
    reconnectAttempts = 0;
    clearReconnect();
    openSocket();
  },

  /** Đóng kết nối khi đăng xuất. */
  disconnect() {
    wantConnected = false;
    myUserId = null;
    clearReconnect();
    stopHeartbeat();
    if (ws) {
      try {
        ws.onclose = null;
        ws.close();
      } catch {}
      ws = null;
    }
    notifyStatus(false);
  },

  isConnected(): boolean {
    return !!ws && ws.readyState === WebSocket.OPEN;
  },

  /** Nghe tin nhắn của một thread (rescueId + role đối phương). Trả về hàm huỷ đăng ký. */
  subscribe(rescueId: number, peer: ChatPeer, handler: MessageHandler): () => void {
    const key = keyOf(rescueId, peer);
    let set = messageSubs.get(key);
    if (!set) {
      set = new Set();
      messageSubs.set(key, set);
    }
    set.add(handler);
    // Đảm bảo socket đang cố kết nối khi có người nghe.
    if (wantConnected) openSocket();
    return () => {
      const s = messageSubs.get(key);
      if (s) {
        s.delete(handler);
        if (s.size === 0) messageSubs.delete(key);
      }
    };
  },

  /** Nghe bất kỳ tin nhắn hoặc cập nhật hội thoại nào (dành cho Inbox/Badge). */
  onAnyMessage(handler: (msg?: ChatMessageDto) => void): () => void {
    globalSubs.add(handler);
    return () => {
      globalSubs.delete(handler);
    };
  },

  /** Nghe sự kiện cuộc gọi (CALL_INCOMING / CALL_ACCEPTED / CALL_SIGNAL / CALL_ENDED). Trả về hàm huỷ đăng ký. */
  onCallEvent(handler: CallEventHandler): () => void {
    callSubs.add(handler);
    return () => {
      callSubs.delete(handler);
    };
  },

  /** Nghe thay đổi trạng thái kết nối (để bật/tắt fallback polling). */
  onStatus(handler: StatusHandler): () => void {
    statusSubs.add(handler);
    handler(this.isConnected());
    return () => {
      statusSubs.delete(handler);
    };
  },
};
