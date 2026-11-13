package com.sras.backend.controller;

import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.CreatePayOSPaymentResponse;
import com.sras.backend.dto.response.RescueRequestResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.service.PayOSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PayOSService payOSService;
    private final UserRepository userRepository;

    /**
     * Tạo link thanh toán PayOS cho đơn cứu hộ.
     */
    @PostMapping("/payos/create-link")
    public ResponseEntity<ApiResponse<CreatePayOSPaymentResponse>> createPayOSLink(
            Authentication authentication,
            @RequestParam Long requestId) {
        User user = getCurrentUser(authentication);
        CreatePayOSPaymentResponse res = payOSService.createPaymentLink(user, requestId);
        return ResponseEntity.ok(ApiResponse.success("Tạo link thanh toán PayOS thành công", res));
    }

    /**
     * Tạo link đặt cọc 50.000đ PayOS cho đơn cứu hộ.
     */
    @PostMapping("/payos/create-deposit-link")
    public ResponseEntity<ApiResponse<CreatePayOSPaymentResponse>> createDepositPayOSLink(
            Authentication authentication,
            @RequestParam Long requestId) {
        User user = getCurrentUser(authentication);
        CreatePayOSPaymentResponse res = payOSService.createPaymentLink(user, requestId);
        return ResponseEntity.ok(ApiResponse.success("Tạo link đặt cọc PayOS thành công", res));
    }

    /**
     * Kiểm tra trạng thái thanh toán của giao dịch PayOS theo orderCode.
     */
    @GetMapping("/payos/status/{orderCode}")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> checkStatus(
            Authentication authentication,
            @PathVariable Long orderCode) {
        User user = getCurrentUser(authentication);
        RescueRequestResponse res = payOSService.checkPaymentStatus(user, orderCode);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    /**
     * Kiểm tra trạng thái đặt cọc 50.000đ của giao dịch PayOS theo orderCode.
     */
    @GetMapping("/payos/deposit-status/{orderCode}")
    public ResponseEntity<ApiResponse<RescueRequestResponse>> checkDepositStatus(
            Authentication authentication,
            @PathVariable Long orderCode) {
        User user = getCurrentUser(authentication);
        RescueRequestResponse res = payOSService.checkPaymentStatus(user, orderCode);
        return ResponseEntity.ok(ApiResponse.success(res));
    }

    /**
     * Webhook nhận kết quả thanh toán từ PayOS.
     */
    @PostMapping("/payos/webhook")
    public ResponseEntity<ApiResponse<String>> webhook(@RequestBody Map<String, Object> webhookData) {
        // Không log payload: có số tài khoản + chữ ký. Chữ ký được kiểm trong processWebhook.
        payOSService.processWebhook(webhookData);
        return ResponseEntity.ok(ApiResponse.success("Webhook đã xử lý"));
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Chưa đăng nhập");
        }
        String principal = authentication.getName();
        return userRepository.findByPhone(principal)
                .or(() -> userRepository.findByEmail(principal))
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin tài khoản"));
    }
}
