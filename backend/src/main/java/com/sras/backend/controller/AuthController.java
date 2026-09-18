package com.sras.backend.controller;

import com.sras.backend.dto.request.GoogleAuthCheckRequest;
import com.sras.backend.dto.request.GoogleRegisterRequest;
import com.sras.backend.dto.request.GoogleSendOtpRequest;
import com.sras.backend.dto.request.LoginRequest;
import com.sras.backend.dto.request.RegisterRequest;
import com.sras.backend.dto.request.ResendOtpRequest;
import com.sras.backend.dto.request.VerifyOtpRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.AuthResponse;
import com.sras.backend.dto.response.GoogleCheckResponse;
import com.sras.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("User registered successfully. Please verify OTP.", null));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        AuthResponse response = authService.verifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Phone number verified successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<Void>> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        authService.resendOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP resent successfully", null));
    }

    @PostMapping("/google/check")
    public ResponseEntity<ApiResponse<GoogleCheckResponse>> googleCheck(@Valid @RequestBody GoogleAuthCheckRequest request) {
        GoogleCheckResponse response = authService.googleCheck(request);
        return ResponseEntity.ok(ApiResponse.success("Google check processed successfully", response));
    }

    @PostMapping("/google/send-otp")
    public ResponseEntity<ApiResponse<Void>> googleSendOtp(@Valid @RequestBody GoogleSendOtpRequest request) {
        authService.googleSendPhoneOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP sent successfully to phone number", null));
    }

    @PostMapping("/google/verify-register")
    public ResponseEntity<ApiResponse<AuthResponse>> googleVerifyRegister(@Valid @RequestBody GoogleRegisterRequest request) {
        AuthResponse response = authService.googleRegisterWithOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Account created and logged in successfully", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@RequestParam String token) {
        AuthResponse response = authService.refreshToken(token);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestParam String token) {
        authService.logout(token);
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @PostMapping("/email/send-otp")
    public ResponseEntity<ApiResponse<Void>> sendEmailOtp(@Valid @RequestBody com.sras.backend.dto.request.SendEmailOtpRequest request) {
        authService.sendEmailOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Mã xác thực OTP đã được gửi đến email của bạn", null));
    }

    @PostMapping("/email/verify-otp")
    public ResponseEntity<ApiResponse<Void>> verifyEmailOtp(@Valid @RequestBody com.sras.backend.dto.request.VerifyEmailOtpRequest request) {
        authService.verifyEmailOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Xác thực email thành công", null));
    }

    @PostMapping("/update-profile")
    public ResponseEntity<ApiResponse<AuthResponse.UserDetails>> updateProfile(@Valid @RequestBody com.sras.backend.dto.request.UpdateProfileRequest request) {
        AuthResponse.UserDetails updated = authService.updateProfile(request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin hồ sơ thành công", updated));
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<ApiResponse<Void>> forgotPasswordSendOtp(@Valid @RequestBody com.sras.backend.dto.request.ForgotPasswordSendOtpRequest request) {
        authService.forgotPasswordSendOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Mã xác thực OTP đã được gửi.", null));
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<ApiResponse<Void>> forgotPasswordVerifyOtp(@Valid @RequestBody com.sras.backend.dto.request.ForgotPasswordVerifyOtpRequest request) {
        authService.forgotPasswordVerifyOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Xác thực OTP thành công.", null));
    }

    @PostMapping("/forgot-password/reset-password")
    public ResponseEntity<ApiResponse<Void>> forgotPasswordReset(@Valid @RequestBody com.sras.backend.dto.request.ForgotPasswordResetRequest request) {
        authService.forgotPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.", null));
    }

    @org.springframework.web.bind.annotation.GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse.UserDetails>> getMe(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new com.sras.backend.exception.UnauthorizedException("Vui lòng đăng nhập");
        }
        AuthResponse.UserDetails userDetails = authService.getCurrentUserProfile(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tài khoản thành công", userDetails));
    }

    @PostMapping("/sync-role")
    public ResponseEntity<ApiResponse<AuthResponse>> syncRole(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new com.sras.backend.exception.UnauthorizedException("Vui lòng đăng nhập");
        }
        AuthResponse response = authService.syncRole(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Đồng bộ quyền tài khoản thành công", response));
    }
}
