package com.sras.backend.websocket;

import com.sras.backend.repository.UserRepository;
import com.sras.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

/**
 * Xác thực handshake WebSocket qua query param {@code ?token=<jwt>} — vì React Native không set
 * được header Authorization trên WebSocket. Token hợp lệ → gắn {@code userId} vào session attributes
 * cho {@link ChatWebSocketHandler}. Token thiếu/sai → từ chối handshake (return false).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuthHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String token = tokenFromQuery(request);
        if (token == null || !jwtService.isTokenValid(token)) {
            return false;
        }
        try {
            String phone = jwtService.extractUsername(token);
            return userRepository.findByPhone(phone)
                    .map(user -> {
                        attributes.put(ChatWebSocketHandler.USER_ID_ATTR, user.getId());
                        return true;
                    })
                    .orElse(false);
        } catch (Exception e) {
            log.debug("Chat WS handshake rejected: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }

    private String tokenFromQuery(ServerHttpRequest request) {
        List<String> values = UriComponentsBuilder.fromUri(request.getURI())
                .build().getQueryParams().get("token");
        return (values == null || values.isEmpty()) ? null : values.get(0);
    }
}
