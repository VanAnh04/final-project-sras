package com.sras.backend.service.impl;

import com.sras.backend.service.SmsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class MockSmsServiceImpl implements SmsService {
    
    @Override
    public void sendOtp(String phone, String otp) {
        log.info("==========================================================");
        log.info("📱 [MOCK SMS SERVICE] GỬI MÃ XÁC THỰC OTP");
        log.info("👉 Gửi tới SĐT: {}", phone);
        log.info("🔑 Mã OTP (Mặc định Demo): {}", otp);
        log.info("⏰ Hạn sử dụng: 5 phút");
        log.info("==========================================================");
    }
}
