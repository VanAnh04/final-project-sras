package com.sras.backend.controller;

import com.sras.backend.dto.request.UpdateDispatchConfigRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.DispatchConfigResponse;
import com.sras.backend.entity.User;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.DispatchScoringService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dispatch-config")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDispatchConfigController {

    private final DispatchScoringService dispatchScoringService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<DispatchConfigResponse>> getConfig() {
        DispatchConfigResponse config = dispatchScoringService.getActiveConfigResponse();
        return ResponseEntity.ok(ApiResponse.success("Lấy cấu hình thuật toán điều phối thành công", config));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<DispatchConfigResponse>> updateConfig(
            @Valid @RequestBody UpdateDispatchConfigRequest request,
            @AuthenticationPrincipal String principal) {
        User admin = null;
        if (principal != null) {
            admin = userRepository.findByPhone(principal).orElse(null);
        }
        DispatchConfigResponse updated = dispatchScoringService.updateConfig(request, admin);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cấu hình thuật toán điều phối thành công", updated));
    }
}
