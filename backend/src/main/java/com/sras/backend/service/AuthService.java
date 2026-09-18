package com.sras.backend.service;

import com.sras.backend.dto.request.LoginRequest;
import com.sras.backend.dto.request.RegisterRequest;
import com.sras.backend.dto.request.ResendOtpRequest;
import com.sras.backend.dto.request.VerifyOtpRequest;
import com.sras.backend.dto.response.AuthResponse;

public interface AuthService {
    void register(RegisterRequest request);
    AuthResponse verifyOtp(VerifyOtpRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(String refreshToken);
    void logout(String refreshToken);
    void resendOtp(ResendOtpRequest request);

    // Clerk — login Google cho customer (token-exchange: đổi Clerk token lấy JWT hệ thống)
    com.sras.backend.dto.response.ClerkExchangeResponse clerkExchange(
            com.sras.backend.dto.request.ClerkExchangeRequest request);
    void clerkSendPhoneOtp(com.sras.backend.dto.request.ClerkSendOtpRequest request);
    AuthResponse clerkRegisterWithOtp(com.sras.backend.dto.request.ClerkRegisterRequest request);

    // Google — login Google cho Web Admin / Garage Owner
    com.sras.backend.dto.response.ClerkExchangeResponse googleCheck(
            com.sras.backend.dto.request.GoogleCheckRequest request);

    void sendEmailOtp(com.sras.backend.dto.request.SendEmailOtpRequest request);
    void verifyEmailOtp(com.sras.backend.dto.request.VerifyEmailOtpRequest request);
    AuthResponse.UserDetails updateProfile(com.sras.backend.dto.request.UpdateProfileRequest request);

    void forgotPasswordSendOtp(com.sras.backend.dto.request.ForgotPasswordSendOtpRequest request);
    void forgotPasswordVerifyOtp(com.sras.backend.dto.request.ForgotPasswordVerifyOtpRequest request);
    void forgotPasswordReset(com.sras.backend.dto.request.ForgotPasswordResetRequest request);
}


