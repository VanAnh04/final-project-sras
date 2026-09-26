package com.sras.backend.controller;

import com.sras.backend.dto.request.CreateGarageStaffRequest;
import com.sras.backend.dto.request.CreateRescueVehicleRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.GarageStaffResponse;
import com.sras.backend.dto.response.RescueVehicleResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.GarageOpsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Quản lý nhân viên + xe cứu hộ của gara (phục vụ điều phối). */
@RestController
@RequestMapping("/api/garages/me")
@RequiredArgsConstructor
public class GarageOpsController {

    private final GarageOpsService garageOpsService;
    private final UserRepository userRepository;

    @GetMapping("/staff")
    public ResponseEntity<ApiResponse<List<GarageStaffResponse>>> listStaff(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(garageOpsService.listStaff(user)));
    }

    @PostMapping("/staff")
    public ResponseEntity<ApiResponse<GarageStaffResponse>> createStaff(
            Authentication authentication, @Valid @RequestBody CreateGarageStaffRequest request) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã thêm nhân viên", garageOpsService.createStaff(user, request)));
    }

    @GetMapping("/rescue-vehicles")
    public ResponseEntity<ApiResponse<List<RescueVehicleResponse>>> listVehicles(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(garageOpsService.listVehicles(user)));
    }

    @PostMapping("/rescue-vehicles")
    public ResponseEntity<ApiResponse<RescueVehicleResponse>> createVehicle(
            Authentication authentication, @Valid @RequestBody CreateRescueVehicleRequest request) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã thêm xe cứu hộ", garageOpsService.createVehicle(user, request)));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}
