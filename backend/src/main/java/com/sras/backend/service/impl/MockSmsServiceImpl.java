package com.sras.backend.service.impl;

import com.sras.backend.service.SmsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class MockSmsServiceImpl implements SmsService {
    
    @Override
    public void sendOtp(String phone, String otp) {
        log.info("Mock SMS OTP sent to {}: {}", phone, otp);
    }
}
