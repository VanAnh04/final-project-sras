package com.sras.backend.controller;

import com.sras.backend.dto.request.RegisterDeviceTokenRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.DeviceTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Đăng ký / hủy thiết bị nhận push notification (Expo). */
@RestController
@RequestMapping("/api/device-tokens")
@RequiredArgsConstructor
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(String principal) {
        return userRepository.findByPhone(principal)
                .orElseThrow(() -> new UnauthorizedException("Người dùng không tồn tại"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> register(
            @AuthenticationPrincipal String principal,
            @Valid @RequestBody RegisterDeviceTokenRequest req) {
        deviceTokenService.register(getAuthenticatedUser(principal), req);
        return ResponseEntity.ok(ApiResponse.success("Đã đăng ký nhận thông báo", null));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> unregister(
            @AuthenticationPrincipal String principal,
            @RequestParam("token") String token) {
        deviceTokenService.unregister(getAuthenticatedUser(principal), token);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy nhận thông báo", null));
    }
}
