package com.sras.backend.controller;

import com.sras.backend.dto.request.GarageRegistrationRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.GarageDashboardResponse;
import com.sras.backend.dto.response.GarageResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.GarageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/garages")
@RequiredArgsConstructor
public class GarageController {

    private final GarageService garageService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<GarageResponse>> registerGarage(
            Authentication authentication,
            @Valid @RequestBody GarageRegistrationRequest request) {
        User user = getCurrentUser(authentication);
        GarageResponse response = garageService.registerGarage(user, request);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký đối tác Gara thành công. Hồ sơ đang chờ phê duyệt!", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<GarageResponse>> getMyGarage(Authentication authentication) {
        User user = getCurrentUser(authentication);
        GarageResponse response = garageService.getMyGarage(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin Gara thành công", response));
    }

    @PutMapping("/me/status")
    public ResponseEntity<ApiResponse<GarageResponse>> updateOnlineStatus(
            Authentication authentication,
            @RequestBody Map<String, Boolean> body) {
        User user = getCurrentUser(authentication);
        Boolean isOnline = body.getOrDefault("isOnline", false);
        GarageResponse response = garageService.updateOnlineStatus(user, isOnline);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái trực tuyến thành công", response));
    }

    @PutMapping("/me/auto-accept")
    public ResponseEntity<ApiResponse<GarageResponse>> updateAutoAccept(
            Authentication authentication,
            @RequestBody Map<String, Boolean> body) {
        User user = getCurrentUser(authentication);
        Boolean autoAccept = body.getOrDefault("autoAccept", false);
        GarageResponse response = garageService.updateAutoAccept(user, autoAccept);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tự động nhận cuốc thành công", response));
    }

    @GetMapping("/me/dashboard")
    public ResponseEntity<ApiResponse<GarageDashboardResponse>> getDashboard(Authentication authentication) {
        User user = getCurrentUser(authentication);
        GarageDashboardResponse response = garageService.getDashboard(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin bảng điều khiển thành công", response));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}