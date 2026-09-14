package com.sras.backend.service;

import com.sras.backend.dto.request.GoogleAuthCheckRequest;
import com.sras.backend.dto.request.GoogleRegisterRequest;
import com.sras.backend.dto.request.GoogleSendOtpRequest;
import com.sras.backend.dto.request.LoginRequest;
import com.sras.backend.dto.request.RegisterRequest;
import com.sras.backend.dto.request.ResendOtpRequest;
import com.sras.backend.dto.request.VerifyOtpRequest;
import com.sras.backend.dto.response.AuthResponse;
import com.sras.backend.dto.response.GoogleCheckResponse;

public interface AuthService {
    void register(RegisterRequest request);
    AuthResponse verifyOtp(VerifyOtpRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(String refreshToken);
    void logout(String refreshToken);
    void resendOtp(ResendOtpRequest request);

    GoogleCheckResponse googleCheck(GoogleAuthCheckRequest request);
    void googleSendPhoneOtp(GoogleSendOtpRequest request);
    AuthResponse googleRegisterWithOtp(GoogleRegisterRequest request);
}

