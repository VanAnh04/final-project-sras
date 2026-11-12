package com.sras.backend.controller;

import com.sras.backend.dto.request.LoginRequest;
import com.sras.backend.dto.request.RefreshTokenRequest;
import com.sras.backend.dto.request.RegisterRequest;
import com.sras.backend.dto.request.ResendOtpRequest;
import com.sras.backend.dto.request.VerifyOtpRequest;
import com.sras.backend.dto.response.ApiResponse;
import com.sras.backend.dto.response.AuthResponse;
import com.sras.backend.exception.UnauthorizedException;
import com.sras.backend.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    private ResponseCookie createRefreshTokenCookie(String refreshToken, Boolean rememberMe) {
        boolean isRemember = rememberMe == null || Boolean.TRUE.equals(rememberMe);
        long maxAgeSeconds = isRemember ? (7L * 24 * 60 * 60) : -1L; // 7 ngày hoặc Session Cookie (xóa khi đóng trình duyệt)
        return ResponseCookie.from("refreshToken", refreshToken != null ? refreshToken : "")
                .httpOnly(true)
                .secure(false) // localhost dev, works over http and https
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite("Lax")
                .build();
    }

    private ResponseCookie deleteRefreshTokenCookie() {
        return ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("User registered successfully. Please verify OTP.", null));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        AuthResponse response = authService.verifyOtp(request);
        ResponseCookie cookie = createRefreshTokenCookie(response.getRefreshToken(), true);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.success("Phone number verified successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        ResponseCookie cookie = createRefreshTokenCookie(response.getRefreshToken(), request.getRememberMe());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<ApiResponse<Void>> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        authService.resendOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP resent successfully", null));
    }

    // ── Clerk: login Google cho customer ──────────────────────────────────────
    @PostMapping("/clerk/exchange")
    public ResponseEntity<ApiResponse<com.sras.backend.dto.response.ClerkExchangeResponse>> clerkExchange(
            @Valid @RequestBody com.sras.backend.dto.request.ClerkExchangeRequest request) {
        var response = authService.clerkExchange(request);
        var resBuilder = ResponseEntity.ok();
        if (response.isExists() && response.getAuth() != null && response.getAuth().getRefreshToken() != null) {
            ResponseCookie cookie = createRefreshTokenCookie(response.getAuth().getRefreshToken(), true);
            resBuilder.header(HttpHeaders.SET_COOKIE, cookie.toString());
        }
        return resBuilder.body(ApiResponse.success("Clerk exchange processed successfully", response));
    }

    @PostMapping("/clerk/send-otp")
    public ResponseEntity<ApiResponse<Void>> clerkSendOtp(
            @Valid @RequestBody com.sras.backend.dto.request.ClerkSendOtpRequest request) {
        authService.clerkSendPhoneOtp(request);
        return ResponseEntity.ok(ApiResponse.success("OTP sent successfully to phone number", null));
    }

    @PostMapping("/clerk/register")
    public ResponseEntity<ApiResponse<AuthResponse>> clerkRegister(
            @Valid @RequestBody com.sras.backend.dto.request.ClerkRegisterRequest request) {
        AuthResponse response = authService.clerkRegisterWithOtp(request);
        ResponseCookie cookie = createRefreshTokenCookie(response.getRefreshToken(), true);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.success("Account created and logged in successfully", response));
    }

    // ── Google: login Google cho Web Admin / Garage Owner ────────────────────
    @PostMapping("/google/check")
    public ResponseEntity<ApiResponse<com.sras.backend.dto.response.ClerkExchangeResponse>> googleCheck(
            @Valid @RequestBody com.sras.backend.dto.request.GoogleCheckRequest request) {
        var response = authService.googleCheck(request);
        var resBuilder = ResponseEntity.ok();
        if (response.isExists() && response.getAuth() != null && response.getAuth().getRefreshToken() != null) {
            ResponseCookie cookie = createRefreshTokenCookie(response.getAuth().getRefreshToken(), true);
            resBuilder.header(HttpHeaders.SET_COOKIE, cookie.toString());
        }
        return resBuilder.body(ApiResponse.success("Google account checked successfully", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @CookieValue(name = "refreshToken", required = false) String cookieToken,
            @RequestParam(required = false) String token,
            @RequestParam(name = "refreshToken", required = false) String formRefreshToken,
            HttpServletRequest request) {

        String resolvedToken = cookieToken;
        if (resolvedToken == null || resolvedToken.isBlank()) {
            resolvedToken = token;
        }
        if (resolvedToken == null || resolvedToken.isBlank()) {
            resolvedToken = formRefreshToken;
        }

        if ((resolvedToken == null || resolvedToken.isBlank())
                && request.getContentType() != null
                && request.getContentType().toLowerCase().contains("application/json")) {
            try {
                RefreshTokenRequest body = objectMapper.readValue(request.getInputStream(), RefreshTokenRequest.class);
                if (body != null) {
                    resolvedToken = body.getRefreshToken() != null && !body.getRefreshToken().isBlank()
                            ? body.getRefreshToken()
                            : body.getToken();
                }
            } catch (Exception ignored) {
            }
        }

        if (resolvedToken == null || resolvedToken.isBlank()) {
            throw new UnauthorizedException("Refresh token is missing");
        }

        AuthResponse response = authService.refreshToken(resolvedToken);
        ResponseCookie cookie = createRefreshTokenCookie(response.getRefreshToken(), true);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.success("Token refreshed successfully", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = "refreshToken", required = false) String cookieToken,
            @RequestParam(required = false) String token,
            @RequestParam(name = "refreshToken", required = false) String formRefreshToken,
            HttpServletRequest request) {

        String resolvedToken = cookieToken;
        if (resolvedToken == null || resolvedToken.isBlank()) {
            resolvedToken = token;
        }
        if (resolvedToken == null || resolvedToken.isBlank()) {
            resolvedToken = formRefreshToken;
        }

        if ((resolvedToken == null || resolvedToken.isBlank())
                && request.getContentType() != null
                && request.getContentType().toLowerCase().contains("application/json")) {
            try {
                RefreshTokenRequest body = objectMapper.readValue(request.getInputStream(), RefreshTokenRequest.class);
                if (body != null) {
                    resolvedToken = body.getRefreshToken() != null && !body.getRefreshToken().isBlank()
                            ? body.getRefreshToken()
                            : body.getToken();
                }
            } catch (Exception ignored) {
            }
        }

        if (resolvedToken != null && !resolvedToken.isBlank()) {
            authService.logout(resolvedToken);
        }

        ResponseCookie cleanCookie = deleteRefreshTokenCookie();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cleanCookie.toString())
                .body(ApiResponse.success("Logout successful", null));
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
    public ResponseEntity<ApiResponse<AuthResponse.UserDetails>> updateProfile(
            org.springframework.security.core.Authentication authentication,
            @Valid @RequestBody com.sras.backend.dto.request.UpdateProfileRequest request) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để cập nhật hồ sơ");
        }
        AuthResponse.UserDetails updated = authService.updateProfile(authentication.getName(), request);
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

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            org.springframework.security.core.Authentication authentication,
            @Valid @RequestBody com.sras.backend.dto.request.ChangePasswordRequest request) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện đổi mật khẩu");
        }
        authService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới.", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse.UserDetails>> getMe(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
        AuthResponse.UserDetails userDetails = authService.getCurrentUserProfile(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin tài khoản thành công", userDetails));
    }

    @PostMapping("/sync-role")
    public ResponseEntity<ApiResponse<AuthResponse>> syncRole(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập");
        }
        AuthResponse response = authService.syncRole(authentication.getName());
        ResponseCookie cookie = createRefreshTokenCookie(response.getRefreshToken(), true);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.success("Đồng bộ quyền tài khoản thành công", response));
    }
}
