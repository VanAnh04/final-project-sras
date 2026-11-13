package com.sras.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** OTP xác thực thao tác nhạy cảm (đổi tài khoản ngân hàng, rút tiền) — {@code app.otp.*}. */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.otp")
public class ActionOtpProperties {

    /** Khoá HMAC băm mã OTP trước khi lưu. Bắt buộc khi chi tiền thật (provider PAYOS). */
    private String actionSecret;

    private int ttlMinutes = 5;
    private int maxAttempts = 5;
    private int resendCooldownSeconds = 60;
    private int maxSendsPerHour = 5;
}
