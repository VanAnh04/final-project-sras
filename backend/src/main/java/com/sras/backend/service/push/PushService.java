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
        if (userId == null) return;
        eventPublisher.publishEvent(new PushRequestedEvent(userId, notificationId, title, body, data));
    }
}
