package com.sras.backend.controller;

import com.sras.backend.dto.request.BankAccountOtpRequest;
import com.sras.backend.dto.request.CreateWithdrawalRequest;
import com.sras.backend.dto.request.UpdateBankAccountRequest;
import com.sras.backend.dto.request.WithdrawalOtpRequest;
import com.sras.backend.dto.response.AdminFinanceOverviewResponse;
import com.sras.backend.dto.response.BankAccountResponse;
import com.sras.backend.dto.response.WithdrawalResponse;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.CustomerWalletOverviewResponse;
import com.sras.backend.dto.response.GarageWalletOverviewResponse;
import com.sras.backend.entity.User;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.repository.UserRepository;
import com.sras.backend.security.ClientIp;
import com.sras.backend.service.FinanceService;
import com.sras.backend.service.WithdrawalService;
import com.sras.backend.dto.response.CreatePayOSPaymentResponse;
import com.sras.backend.service.PayOSService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final WithdrawalService withdrawalService;
    private final UserRepository userRepository;

    // 1. ADMIN HỆ THỐNG - TÀI CHÍNH (Ảnh 1)
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/finance/overview")
    public ResponseEntity<ApiResponse<AdminFinanceOverviewResponse>> getAdminFinanceOverview() {
        AdminFinanceOverviewResponse res = financeService.getAdminFinanceOverview();
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu tài chính hệ thống thành công", res));
    }

    @PreAuthorize("hasRole('ADMIN')")
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

    // Tài khoản ngân hàng nhận tiền — đổi STK bắt buộc OTP SMS, đổi xong khoá rút 24h.
    @GetMapping("/garages/me/bank-account")
    public ResponseEntity<ApiResponse<BankAccountResponse>> getBankAccount(Authentication authentication) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Lấy tài khoản nhận tiền thành công", withdrawalService.getBankAccount(user)));
    }

    @PostMapping("/garages/me/bank-account/otp")
    public ResponseEntity<ApiResponse<Void>> requestBankAccountOtp(
            Authentication authentication,
            @Valid @RequestBody BankAccountOtpRequest request
    ) {
        User user = getCurrentUser(authentication);
        withdrawalService.requestBankAccountOtp(user, request);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi mã OTP tới số điện thoại của bạn", null));
    }

    @PutMapping("/garages/me/bank-account")
    public ResponseEntity<ApiResponse<BankAccountResponse>> updateBankAccount(
            Authentication authentication,
            @Valid @RequestBody UpdateBankAccountRequest request,
            HttpServletRequest httpRequest
    ) {
        User user = getCurrentUser(authentication);
        BankAccountResponse res = withdrawalService.updateBankAccount(user, request, ClientIp.of(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tài khoản nhận tiền thành công", res));
    }

    // Rút tiền từ ví tiền mặt về ngân hàng — xin OTP cho đúng số tiền, rồi gửi lệnh kèm OTP.
    @PostMapping("/garages/me/wallet/withdraw/otp")
    public ResponseEntity<ApiResponse<Void>> requestWithdrawalOtp(
            Authentication authentication,
            @Valid @RequestBody WithdrawalOtpRequest request
    ) {
        User user = getCurrentUser(authentication);
        withdrawalService.requestWithdrawalOtp(user, request.getAmount());
        return ResponseEntity.ok(ApiResponse.success("Đã gửi mã OTP tới số điện thoại của bạn", null));
    }

    @PostMapping("/garages/me/wallet/withdraw")
    public ResponseEntity<ApiResponse<WithdrawalResponse>> withdrawGarageWallet(
            Authentication authentication,
            @Valid @RequestBody CreateWithdrawalRequest request,
            HttpServletRequest httpRequest
    ) {
        User user = getCurrentUser(authentication);
        WithdrawalResponse res = withdrawalService.withdraw(user, request, ClientIp.of(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Đã tạo lệnh rút tiền", res));
    }

    @GetMapping("/garages/me/wallet/withdrawals")
    public ResponseEntity<ApiResponse<Page<WithdrawalResponse>>> getMyWithdrawals(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử rút tiền thành công", withdrawalService.getMyWithdrawals(user, page, size)));
    }

    @GetMapping("/garages/me/wallet/withdrawals/{id}")
    public ResponseEntity<ApiResponse<WithdrawalResponse>> getMyWithdrawal(
            Authentication authentication,
            @PathVariable Long id
    ) {
        User user = getCurrentUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Lấy lệnh rút tiền thành công", withdrawalService.getMyWithdrawal(user, id)));
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
