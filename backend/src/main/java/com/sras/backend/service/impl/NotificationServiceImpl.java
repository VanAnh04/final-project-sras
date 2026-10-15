package com.sras.backend.service.impl;

import com.sras.backend.dto.response.NotificationResponse;
import com.sras.backend.entity.Notification;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.repository.NotificationRepository;
import com.sras.backend.service.NotificationService;
import com.sras.backend.service.push.PushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final PushService pushService;

    @Override
    @Transactional
    public void createNotification(User user, NotificationType type, String title, String body, String refType, Long refId) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setBody(body);
        notification.setRefType(refType);
        notification.setRefId(refId);
        notification.setIsRead(false);
        notification.setSentViaFcm(false);
        Notification saved = notificationRepository.save(notification);
        log.info("Notification created for user {}: {}", user.getId(), title);

        // Push gửi sau khi transaction của nghiệp vụ gọi tới commit (xem PushEventListener).
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("notificationId", saved.getId());
        data.put("type", type.name());
        if (refType != null) data.put("refType", refType);
        if (refId != null) data.put("refId", refId);
        pushService.sendAfterCommit(user.getId(), saved.getId(), title, body, data);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(User user, Pageable pageable) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getRecentNotifications(User user) {
        return notificationRepository.findTop20ByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId, User user) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser().getId().equals(user.getId())) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Override
    @Transactional
    public void markAllAsRead(User user) {
        notificationRepository.markAllAsRead(user);
    }

    @Override
    @Transactional
    public void markSentViaPush(Long notificationId) {
        notificationRepository.markSentViaPush(notificationId);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .body(n.getBody())
                .refType(n.getRefType())
                .refId(n.getRefId())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
