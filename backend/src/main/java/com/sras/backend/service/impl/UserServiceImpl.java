package com.sras.backend.service.impl;

import com.sras.backend.dto.request.UserWarningRequest;
import com.sras.backend.dto.response.AuditLogResponse;
import com.sras.backend.dto.response.UserResponse;
import com.sras.backend.entity.AuditLog;
import com.sras.backend.entity.Notification;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.NotificationType;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import com.sras.backend.exception.ResourceNotFoundException;
import com.sras.backend.repository.AuditLogRepository;
import com.sras.backend.repository.NotificationRepository;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.UserService;
import com.sras.backend.websocket.UserWebSocketHandler;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserWebSocketHandler userWebSocketHandler;

    private UserResponse mapToUserResponseWithLatestLog(User user) {
        AuditLog latest = auditLogRepository.findFirstByEntityTypeAndEntityIdOrderByCreatedAtDesc("users", user.getId())
                .orElse(null);

        String latestActivity = null;
        java.time.OffsetDateTime latestActivityAt = null;

        if (latest != null) {
            latestActivityAt = latest.getCreatedAt();
            if ("WARN_USER".equals(latest.getAction())) {
                latestActivity = "Gửi cảnh báo";
            } else if ("UPDATE_STATUS".equals(latest.getAction())) {
                latestActivity = "Đổi trạng thái (" + latest.getAfterValue() + ")";
            } else if ("REGISTER".equals(latest.getAction()) || "REGISTER_GOOGLE".equals(latest.getAction())) {
                latestActivity = "Đăng ký tài khoản";
            } else if ("LOGIN".equals(latest.getAction()) || "LOGIN_GOOGLE".equals(latest.getAction()) || "VERIFY_OTP_LOGIN".equals(latest.getAction())) {
                latestActivity = "Đăng nhập";
            } else if ("RESET_PASSWORD".equals(latest.getAction()) || "CHANGE_PASSWORD".equals(latest.getAction())) {
                latestActivity = "Đặt lại mật khẩu";
            } else if ("LOGOUT".equals(latest.getAction())) {
                latestActivity = "Đăng xuất";
            } else if ("UPDATE_PROFILE".equals(latest.getAction())) {
                latestActivity = "Cập nhật hồ sơ";
            } else {
                latestActivity = latest.getAction();
            }
        }

        return UserResponse.fromEntity(user, latestActivity, latestActivityAt);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponseWithLatestLog)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getUsersFiltered(
            UserStatus status,
            UserRole role,
            String search,
            Pageable pageable
    ) {
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }

            if (search != null && !search.trim().isEmpty()) {
                String keyword = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("fullName")), keyword);
                Predicate phoneLike = cb.like(cb.lower(root.get("phone")), keyword);
                Predicate emailLike = cb.like(cb.lower(root.get("email")), keyword);
                predicates.add(cb.or(nameLike, phoneLike, emailLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return userRepository.findAll(spec, pageable).map(this::mapToUserResponseWithLatestLog);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));
        return mapToUserResponseWithLatestLog(user);
    }

    @Override
    @Transactional
    public UserResponse updateUserStatus(Long id, UserStatus newStatus) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + id));
        UserStatus oldStatus = user.getStatus();
        user.setStatus(newStatus);
        User updatedUser = userRepository.save(user);

        AuditLog auditLog = new AuditLog();
        auditLog.setAction("UPDATE_STATUS");
        auditLog.setEntityType("users");
        auditLog.setEntityId(user.getId());
        auditLog.setBeforeValue(oldStatus != null ? oldStatus.name() : null);
        auditLog.setAfterValue(newStatus.name());
        auditLogRepository.save(auditLog);

        userWebSocketHandler.broadcastUserUpdate();

        return UserResponse.fromEntity(updatedUser);
    }

    @Override
    @Transactional
    public void sendUserWarning(UserWarningRequest request) {
        List<User> targetUsers = new ArrayList<>();

        if (request.getUserId() != null) {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + request.getUserId()));
            targetUsers.add(user);
        } else if (request.getUserIds() != null && !request.getUserIds().isEmpty()) {
            targetUsers = userRepository.findAllById(request.getUserIds());
        } else {
            targetUsers = userRepository.findAll();
        }

        String warningTitle = (request.getTitle() != null && !request.getTitle().isBlank())
                ? request.getTitle()
                : "Cảnh báo từ Quản trị viên";

        for (User user : targetUsers) {
            Notification notification = new Notification();
            notification.setUser(user);
            notification.setType(NotificationType.SYSTEM_WARNING);
            notification.setTitle(warningTitle);
            notification.setBody(request.getContent());
            notification.setIsRead(false);
            notification.setSentViaFcm(false);
            notification.setRefType("USER_WARNING");
            notification.setRefId(user.getId());
            notificationRepository.save(notification);

            AuditLog auditLog = new AuditLog();
            auditLog.setAction("WARN_USER");
            auditLog.setEntityType("users");
            auditLog.setEntityId(user.getId());
            auditLog.setAfterValue(request.getContent());
            auditLogRepository.save(auditLog);
        }

        userWebSocketHandler.broadcastUserUpdate();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLogResponse> getUserAuditLogs(Long id) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("users", id)
                .stream()
                .map(AuditLogResponse::fromEntity)
                .toList();
    }
}
