package com.sras.backend.service.push;

import com.sras.backend.entity.DeviceToken;
import com.sras.backend.repository.DeviceTokenRepository;
import com.sras.backend.service.DeviceTokenService;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

/**
 * Gửi push thật sự: chạy bất đồng bộ, chỉ sau khi transaction phát event đã commit
 * (đơn rollback thì không ai nhận push). Không có transaction (gọi ngoài service) thì vẫn chạy.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PushEventListener {

    private final DeviceTokenRepository deviceTokenRepository;
    private final DeviceTokenService deviceTokenService;
    private final NotificationService notificationService;
    private final ExpoPushClient expoPushClient;

    @Value("${app.push.enabled:true}")
    private boolean pushEnabled;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onPushRequested(PushRequestedEvent event) {
        if (!pushEnabled) return;
        try {
            List<String> tokens = deviceTokenRepository.findByUserIdAndIsDeletedFalse(event.userId()).stream()
                    .map(DeviceToken::getFcmToken)
                    .toList();
            if (tokens.isEmpty()) return;

            ExpoPushClient.Result result = expoPushClient.send(tokens, event.title(), event.body(), event.data());
            result.deadTokens().forEach(deviceTokenService::deactivate);
            if (result.okCount() > 0 && event.notificationId() != null) {
                notificationService.markSentViaPush(event.notificationId());
            }
        } catch (Exception e) {
            log.warn("Xử lý push cho user {} thất bại: {}", event.userId(), e.getMessage());
        }
    }
}
