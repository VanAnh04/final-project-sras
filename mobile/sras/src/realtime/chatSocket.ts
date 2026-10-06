import { API_ORIGIN, getAccessToken } from '../api/axiosClient';
import type { ChatMessageDto, ChatPeer } from '../api/chatApi';

/**
 * Kết nối WebSocket dùng chung cho chat realtime. Token đưa qua query param vì React Native
 * không set được header Authorization trên WebSocket. Tự reconnect (backoff) khi rớt.
 *
 * Định tuyến: mỗi màn chat subscribe theo (rescueId, peerRole). Với mỗi tin đến, peerRole được
 * suy ra theo góc nhìn "tôi" = phía KHÔNG phải mình trong tin nhắn.
 */

type MessageHandler = (msg: ChatMessageDto) => void;
type StatusHandler = (connected: boolean) => void;

const WS_URL_BASE = API_ORIGIN.replace(/^http/i, 'ws') + '/ws/chat';

let ws: WebSocket | null = null;
let myUserId: number | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let wantConnected = false;

const messageSubs = new Map<string, Set<MessageHandler>>();
const statusSubs = new Set<StatusHandler>();

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
    notifyStatus(true);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(typeof event.data === 'string' ? event.data : '');
      if (data?.event === 'CHAT_MESSAGE' && data.message) {
        dispatchMessage(data.message as ChatMessageDto);
      }
    } catch {}
  };

  ws.onerror = () => {
    // onclose sẽ lo reconnect.
  };

  ws.onclose = () => {
    notifyStatus(false);
    ws = null;
    scheduleReconnect();
  };
};

const globalSubs = new Set<(msg?: ChatMessageDto) => void>();

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
  const subs = messageSubs.get(keyOf(msg.rescueRequestId, peerRole));
  if (!subs) return;
  subs.forEach((h) => {
    try {
      h(msg);
    } catch {}
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

  /** Nghe thay đổi trạng thái kết nối (để bật/tắt fallback polling). */
  onStatus(handler: StatusHandler): () => void {
    statusSubs.add(handler);
    handler(this.isConnected());
    return () => {
      statusSubs.delete(handler);
    };
  },
};
