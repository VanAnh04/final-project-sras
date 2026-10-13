package com.sras.backend.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Realtime chat delivery. Sessions are grouped by authenticated {@code userId} (gắn bởi
 * {@link AuthHandshakeInterceptor} vào handshake attributes), cho phép đẩy tin tới đúng người —
 * kể cả khi họ mở nhiều thiết bị.
 *
 * <p>Client gửi/lưu tin qua REST; handler này chỉ đẩy (không nhận) — mọi tin đến đều bỏ qua.
 */
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    /** Khoá attribute do interceptor gắn vào phiên. */
    public static final String USER_ID_ATTR = "userId";

    private final ConcurrentHashMap<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = (Long) session.getAttributes().get(USER_ID_ATTR);
        if (userId == null) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        sessionsByUser.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(session);
        session.sendMessage(new TextMessage("{\"event\":\"CONNECTED\"}"));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long userId = (Long) session.getAttributes().get(USER_ID_ATTR);
        if (userId == null) return;
        Set<WebSocketSession> set = sessionsByUser.get(userId);
        if (set != null) {
            set.remove(session);
            if (set.isEmpty()) sessionsByUser.remove(userId);
        }
    }

    /** true nếu {@code userId} đang có ít nhất 1 phiên WebSocket mở (app đang chạy). */
    public boolean isOnline(Long userId) {
        if (userId == null) return false;
        Set<WebSocketSession> set = sessionsByUser.get(userId);
        return set != null && set.stream().anyMatch(WebSocketSession::isOpen);
    }

    /** Đẩy một payload JSON tới mọi phiên đang mở của {@code userId}. */
    public void sendToUser(Long userId, String jsonPayload) {
        if (userId == null) return;
        Set<WebSocketSession> set = sessionsByUser.get(userId);
        if (set == null) return;
        TextMessage message = new TextMessage(jsonPayload);
        for (WebSocketSession session : set) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(message);
                } catch (IOException e) {
                    set.remove(session);
                }
            }
        }
    }
}
