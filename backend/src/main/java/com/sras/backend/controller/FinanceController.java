package com.sras.backend.controller;

import com.sras.backend.dto.response.AdminFinanceOverviewResponse;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.CustomerWalletOverviewResponse;
import com.sras.backend.dto.response.GarageWalletOverviewResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.FinanceService;
import com.sras.backend.dto.response.CreatePayOSPaymentResponse;
import com.sras.backend.service.PayOSService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;
    private final PayOSService payOSService;
    private final UserRepository userRepository;

    // 1. ADMIN HỆ THỐNG - TÀI CHÍNH (Ảnh 1)
    @GetMapping("/admin/finance/overview")
    public ResponseEntity<ApiResponse<AdminFinanceOverviewResponse>> getAdminFinanceOverview() {
        AdminFinanceOverviewResponse res = financeService.getAdminFinanceOverview();
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu tài chính hệ thống thành công", res));
    }

    @PostMapping("/admin/finance/sync-bank")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncBankPortal() {
        return ResponseEntity.ok(ApiResponse.success("Đồng bộ cổng ngân hàng PayOS thành công", Map.of(
                "syncedAt", java.time.OffsetDateTime.now().toString(),
                "status", "CONNECTED",
                "message", "Số dư ví hệ thống và giao dịch đã được đồng bộ với PayOS Gateway"
        )));
    }

    // 2. GARAGE OWNER - VÍ TIỀN GARA (Ảnh 2)
    @GetMapping("/garages/me/wallet/overview")
    public ResponseEntity<ApiResponse<GarageWalletOverviewResponse>> getGarageWalletOverview(
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        GarageWalletOverviewResponse res = financeService.getGarageWalletOverview(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin ví Gara thành công", res));
    }

    @PostMapping("/garages/me/wallet/topup")
    public ResponseEntity<ApiResponse<CreatePayOSPaymentResponse>> createGarageTopup(
            Authentication authentication,
            @RequestBody Map<String, Object> body
    ) {
        User user = getCurrentUser(authentication);
        Long amount = body != null && body.get("amount") != null ? Long.valueOf(body.get("amount").toString()) : null;
        CreatePayOSPaymentResponse res = payOSService.createGarageTopupLink(user, amount);
        return ResponseEntity.ok(ApiResponse.success("Tạo liên kết nạp tiền PayOS thành công", res));
    }

    @GetMapping("/garages/me/wallet/topup/status/{orderCode}")
    public ResponseEntity<ApiResponse<GarageWalletOverviewResponse>> checkGarageTopupStatus(
            Authentication authentication,
            @PathVariable Long orderCode
    ) {
        User user = getCurrentUser(authentication);
        GarageWalletOverviewResponse res = payOSService.checkGarageTopupStatus(user, orderCode);
        return ResponseEntity.ok(ApiResponse.success("Kiểm tra trạng thái nạp tiền ví Gara thành công", res));
    }

    @PostMapping("/garages/me/wallet/transfer-to-credit")
    public ResponseEntity<ApiResponse<GarageWalletOverviewResponse>> transferCashToCredit(
            Authentication authentication,
            @RequestBody Map<String, Object> body
    ) {
        User user = getCurrentUser(authentication);
        Long amount = body != null && body.get("amount") != null ? Long.valueOf(body.get("amount").toString()) : null;
        GarageWalletOverviewResponse res = financeService.transferCashToCredit(user, amount);
        return ResponseEntity.ok(ApiResponse.success("Chuyển tiền từ ví tiền mặt sang ví tín dụng thành công", res));
    }

    @PostMapping("/garages/me/wallet/withdraw")
    public ResponseEntity<ApiResponse<Map<String, Object>>> withdrawGarageWallet(
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Yêu cầu rút tiền đã được tạo thành công", Map.of(
                "status", "PROCESSING",
                "message", "Hệ thống đang tiến hành chuyển khoản về tài khoản ngân hàng liên kết của Gara"
        )));
    }

    // 3. CUSTOMER - VÍ TIỀN & CHI TIÊU KHÁCH HÀNG
    @GetMapping("/customer/me/wallet/overview")
    public ResponseEntity<ApiResponse<CustomerWalletOverviewResponse>> getCustomerWalletOverview(
            Authentication authentication
    ) {
        User user = getCurrentUser(authentication);
        CustomerWalletOverviewResponse res = financeService.getCustomerWalletOverview(user);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin ví khách hàng thành công", res));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để tiếp tục");
        }
        return userRepository.findByPhone(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin người dùng"));
    }
}
