package com.sras.backend.service.push;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Điểm vào duy nhất để gửi push. Chỉ phát event — việc gửi thật do {@link PushEventListener}
 * làm sau khi transaction hiện tại commit (rollback thì không gửi).
 */
@Component
@RequiredArgsConstructor
public class PushService {

    private final ApplicationEventPublisher eventPublisher;

    public void sendAfterCommit(Long userId, Long notificationId, String title, String body, Map<String, Object> data) {
        sendAfterCommit(userId, notificationId, title, body, data, null);
    }

    /**
     * Như hàm trên, kèm {@code ttlSeconds}: quá thời gian này mà máy chưa nhận được thì Expo bỏ push
     * (dùng cho push cuộc gọi đến — cuộc gọi hết đổ chuông thì push cũ không còn ý nghĩa).
     */
    public void sendAfterCommit(Long userId, Long notificationId, String title, String body,
                                Map<String, Object> data, Integer ttlSeconds) {
        if (userId == null) return;
        eventPublisher.publishEvent(new PushRequestedEvent(userId, notificationId, title, body, data, ttlSeconds));
    }
}
