package com.sras.backend.controller;

import com.sras.backend.dto.request.RescuePricingConfigRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.RescuePricingConfigResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.VehicleType;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.RescuePricingConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/pricing-config")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRescuePricingController {

    private final RescuePricingConfigService pricingConfigService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RescuePricingConfigResponse>>> getAllConfigs() {
        List<RescuePricingConfigResponse> configs = pricingConfigService.getAllConfigs();
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình biểu phí thành công", configs));
    }

    @GetMapping("/{vehicleType}")
    public ResponseEntity<ApiResponse<RescuePricingConfigResponse>> getConfig(
            @PathVariable VehicleType vehicleType) {
        RescuePricingConfigResponse config = pricingConfigService.getConfig(vehicleType);
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình thành công", config));
    }

    @PutMapping("/{vehicleType}")
    public ResponseEntity<ApiResponse<RescuePricingConfigResponse>> updateConfig(
            @PathVariable VehicleType vehicleType,
            @Valid @RequestBody RescuePricingConfigRequest request,
            @AuthenticationPrincipal String principal) {
        Long userId = null;
        if (principal != null) {
            userId = userRepository.findByPhone(principal).map(User::getId).orElse(null);
        }
        RescuePricingConfigResponse updated = pricingConfigService.updateConfig(vehicleType, request, userId);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật biểu phí thành công", updated));
    }

    @GetMapping("/preview/calculate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewCalculation(
            @RequestParam VehicleType vehicleType,
            @RequestParam double distanceKm,
            @RequestParam(required = false) Integer hour) {
        OffsetDateTime testTime = OffsetDateTime.now();
        if (hour != null && hour >= 0 && hour <= 23) {
            testTime = testTime.withHour(hour);
        }
        long fee = pricingConfigService.calculateRescueFee(vehicleType, distanceKm, testTime);
        return ResponseEntity.ok(ApiResponse.success("Tính thử cước phí thành công", Map.of(
                "vehicleType", vehicleType,
                "distanceKm", distanceKm,
                "hour", testTime.getHour(),
                "calculatedFee", fee
        )));
    }
}
