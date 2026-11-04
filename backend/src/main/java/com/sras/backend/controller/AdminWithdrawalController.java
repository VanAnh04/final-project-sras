package com.sras.backend.controller;

import com.sras.backend.dto.request.ResolveWithdrawalRequest;
import com.sras.backend.dto.response.AdminWithdrawalResponse;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.entity.User;
import com.sras.backend.entity.enums.WithdrawalStatus;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.security.ClientIp;
import com.sras.backend.service.WithdrawalService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/** Admin theo dõi / xử lý lệnh rút tiền treo của gara. Rút tiền chạy tự động — admin chỉ can thiệp lệnh bị cắm cờ. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminWithdrawalController {

    private final WithdrawalService withdrawalService;
    private final UserRepository userRepository;

    @GetMapping("/withdrawals")
    public ResponseEntity<ApiResponse<Page<AdminWithdrawalResponse>>> list(
            @RequestParam(required = false) WithdrawalStatus status,
            @RequestParam(required = false) Boolean needsReview,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lệnh rút tiền thành công",
                withdrawalService.adminList(status, needsReview, page, size)));
    }

    @GetMapping("/withdrawals/{id}")
    public ResponseEntity<ApiResponse<AdminWithdrawalResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lệnh rút tiền thành công", withdrawalService.adminGet(id)));
    }

    /** Đối soát ngay một lệnh với cổng chi (không chờ job định kỳ). */
    @PostMapping("/withdrawals/{id}/sync")
    public ResponseEntity<ApiResponse<AdminWithdrawalResponse>> sync(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Đã đối soát lệnh rút tiền với cổng chi", withdrawalService.adminSync(id)));
    }

    @PostMapping("/withdrawals/{id}/resolve")
    public ResponseEntity<ApiResponse<AdminWithdrawalResponse>> resolve(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ResolveWithdrawalRequest request,
            HttpServletRequest httpRequest
    ) {
        User admin = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đã xử lý lệnh rút tiền",
                withdrawalService.adminResolve(admin, id, request, ClientIp.of(httpRequest))));
    }

    @GetMapping("/payout/balance")
    public ResponseEntity<ApiResponse<Map<String, Object>>> payoutBalance() {
        Map<String, Object> data = new HashMap<>();
        data.put("balance", withdrawalService.payoutBalance());
        return ResponseEntity.ok(ApiResponse.success("Lấy số dư tài khoản chi thành công", data));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}
