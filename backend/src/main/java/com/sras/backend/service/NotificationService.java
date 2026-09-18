package com.sras.backend.service;

import com.sras.backend.dto.response.NotificationResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface NotificationService {
    void createNotification(User user, NotificationType type, String title, String body, String refType, Long refId);
    Page<NotificationResponse> getMyNotifications(User user, Pageable pageable);
    List<NotificationResponse> getRecentNotifications(User user);
    long getUnreadCount(User user);
    void markAsRead(Long notificationId, User user);
    void markAllAsRead(User user);
}
