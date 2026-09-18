package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClerkExchangeResponse {
    /** true → tài khoản đã tồn tại, đăng nhập luôn (xem {@link #auth}). */
    private boolean exists;
    private String email;
    private String fullName;
    private String avatarUrl;
    /** Chỉ có khi exists=false: vé đăng ký ngắn hạn để bước phone+OTP tạo tài khoản. */
    private String registrationToken;
    /** Chỉ có khi exists=true: access/refresh token của hệ thống. */
    private AuthResponse auth;
}
