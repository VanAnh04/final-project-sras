package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.UserRole;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private String accessToken;
    // We might not send refreshToken in the body if we use HttpOnly cookie, 
    // but the mobile app needs it. We will send it in the body.
    private String refreshToken; 
    private UserDetails user;

    @Data
    @Builder
    public static class UserDetails {
        private Long id;
        private String fullName;
        private String phone;
        private String email;
        private String avatarUrl;
        private UserRole role;
        private Boolean isPhoneVerified;
    }
}
