package com.sras.backend.controller;

import com.sras.backend.dto.request.AddGarageStaffRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.StaffDashboardResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.GarageStaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/garages")
@RequiredArgsConstructor
public class GarageStaffController {

    private final GarageStaffService garageStaffService;
    private final UserRepository userRepository;

    // ── Phía Chủ Gara (GARAGE_OWNER) ───────────────────────────────────

    @GetMapping("/me/staff")
    public ResponseEntity<ApiResponse<List<GarageStaffResponse>>> getStaffList(Authentication authentication) {
        User user = getCurrentUser(authentication);
        List<GarageStaffResponse> response = garageStaffService.getStaffList(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhân viên thành công", response));
    }

    @PostMapping("/me/staff")
    public ResponseEntity<ApiResponse<GarageStaffResponse>> addStaff(
            Authentication authentication,
            @Valid @RequestBody AddGarageStaffRequest request) {
        User user = getCurrentUser(authentication);
        GarageStaffResponse response = garageStaffService.addStaff(user, request);
        return ResponseEntity.ok(ApiResponse.success("Thêm nhân viên vào Gara thành công!", response));
    }

    @PatchMapping("/me/staff/{id}/toggle-active")
    public ResponseEntity<ApiResponse<GarageStaffResponse>> toggleStaffActive(
            Authentication authentication,
            @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        GarageStaffResponse response = garageStaffService.toggleStaffActive(user, id);
        String msg = Boolean.TRUE.equals(response.getIsActive())
                ? "Đã kích hoạt nhân viên làm việc lại"
                : "Đã cho nhân viên tạm nghỉ ca";
        return ResponseEntity.ok(ApiResponse.success(msg, response));
    }

    @DeleteMapping("/me/staff/{id}")
    public ResponseEntity<ApiResponse<Void>> removeStaff(
            Authentication authentication,
            @PathVariable Long id) {
        User user = getCurrentUser(authentication);
        garageStaffService.removeStaff(user, id);
        return ResponseEntity.ok(ApiResponse.success("Đã cho nhân viên thôi việc và xoá khỏi Gara", null));
    }

    // ── Phía Thợ Cứu hộ (GARAGE_STAFF) ──────────────────────────────────

    @GetMapping("/staff/me")
    public ResponseEntity<ApiResponse<StaffDashboardResponse>> getStaffDashboard(Authentication authentication) {
        User user = getCurrentUser(authentication);
        StaffDashboardResponse response = garageStaffService.getStaffDashboard(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu thợ cứu hộ thành công", response));
    }

    @PutMapping("/staff/me/status")
    public ResponseEntity<ApiResponse<StaffDashboardResponse>> updateOnlineStatus(
            Authentication authentication,
            @RequestBody Map<String, Boolean> body) {
        User user = getCurrentUser(authentication);
        boolean isOnline = body.getOrDefault("isOnline", false);
        StaffDashboardResponse response = garageStaffService.updateStaffOnlineStatus(user, isOnline);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái trực tuyến thành công", response));
    }

    @PostMapping("/staff/leave")
    public ResponseEntity<ApiResponse<Void>> staffLeaveGarage(Authentication authentication) {
        User user = getCurrentUser(authentication);
        garageStaffService.staffLeaveGarage(user);
        return ResponseEntity.ok(ApiResponse.success("Bạn đã rời khỏi Gara thành công", null));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}
