package com.sras.backend.controller;

import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.NotificationResponse;
import com.sras.backend.entity.User;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(String principal) {
        return userRepository.findByPhone(principal)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getMyNotifications(
            @AuthenticationPrincipal String principal,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(ApiResponse.success(notificationService.getMyNotifications(user, PageRequest.of(page, size))));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getRecentNotifications(
            @AuthenticationPrincipal String principal) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(ApiResponse.success(notificationService.getRecentNotifications(user)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal String principal) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(ApiResponse.success(Map.of("unreadCount", notificationService.getUnreadCount(user))));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal String principal,
            @PathVariable("id") Long id) {
        User user = getAuthenticatedUser(principal);
        notificationService.markAsRead(id, user);
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu đã đọc", null));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal String principal) {
        User user = getAuthenticatedUser(principal);
        notificationService.markAllAsRead(user);
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu tất cả là đã đọc", null));
    }
}
