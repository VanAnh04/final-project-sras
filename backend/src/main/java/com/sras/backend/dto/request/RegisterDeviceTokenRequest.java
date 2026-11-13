package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Đăng ký thiết bị nhận push (Expo push token dạng {@code ExponentPushToken[...]}). */
@Data
public class RegisterDeviceTokenRequest {

    @NotBlank(message = "Thiếu push token")
    @Size(max = 255, message = "Push token không hợp lệ")
    private String token;

    @NotNull(message = "Thiếu nền tảng thiết bị")
    private DevicePlatform platform;
}
