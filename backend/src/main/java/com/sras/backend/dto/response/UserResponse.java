package com.sras.backend.dto.response;

import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String phone;
    private String fullName;
    private String email;
    private String avatarUrl;
    private UserRole role;
    private UserStatus status;
    private Long debtAmount;
    private Boolean isBlockedByDebt;
    private Boolean isPhoneVerified;
    private OffsetDateTime createdAt;
    private OffsetDateTime lastLoginAt;
    private String latestActivity;
    private OffsetDateTime latestActivityAt;

    public static UserResponse fromEntity(User user) {
        return fromEntity(user, null, null);
    }

    public static UserResponse fromEntity(User user, String latestActivity, OffsetDateTime latestActivityAt) {
        if (user == null) {
            return null;
        }
        return UserResponse.builder()
                .id(user.getId())
                .phone(user.getPhone())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .status(user.getStatus())
                .debtAmount(user.getDebtAmount())
                .isBlockedByDebt(user.getIsBlockedByDebt())
                .isPhoneVerified(user.getIsPhoneVerified())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .latestActivity(latestActivity)
                .latestActivityAt(latestActivityAt)
                .build();
    }
}
