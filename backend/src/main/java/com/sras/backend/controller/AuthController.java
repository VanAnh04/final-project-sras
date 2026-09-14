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
}
