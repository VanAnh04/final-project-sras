package com.sras.backend.service;

public interface SmsService {
    void sendOtp(String phone, String otp);
}
