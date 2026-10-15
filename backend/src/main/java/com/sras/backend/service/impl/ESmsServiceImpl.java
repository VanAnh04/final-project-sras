package com.sras.backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.exception.BadRequestException;
import com.sras.backend.service.SmsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
@Primary
@Slf4j
public class ESmsServiceImpl implements SmsService {

    @Value("${esms.api-key:}")
    private String apiKey;

    @Value("${esms.secret-key:}")
    private String secretKey;

    @Value("${esms.sms-type:${ESMS_SMS_TYPE:2}}")
    private String smsType;

    @Value("${esms.brandname:${ESMS_BRANDNAME:Baotrixemay}}")
    private String brandname;

    @Value("${esms.sandbox:${ESMS_SANDBOX:0}}")
    private String sandbox;

    private static final String ESMS_API_URL = "http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Override
    public void sendOtp(String phone, String otp) {
        if (phone == null || phone.isBlank()) {
            throw new BadRequestException("Số điện thoại nhận OTP không hợp lệ.");
        }

        // Chuẩn hóa số điện thoại sang định dạng 0xxxxxxxxx
        String rawPhone = phone.trim();
        final String normalizedPhone = rawPhone.startsWith("+84")
                ? "0" + rawPhone.substring(3)
                : (rawPhone.startsWith("84") && rawPhone.length() >= 11
                ? "0" + rawPhone.substring(2)
                : rawPhone);

        // Thiếu key thì báo lỗi rõ ràng thay vì dùng key mặc định trong code.
        if (apiKey == null || apiKey.isBlank() || secretKey == null || secretKey.isBlank()) {
            log.error("eSMS chưa cấu hình: thiếu ESMS_API_KEY / ESMS_SECRET_KEY trong backend/.env");
            throw new BadRequestException("Dịch vụ gửi SMS chưa được cấu hình. Vui lòng liên hệ quản trị viên.");
        }
        String validApiKey = apiKey.trim();
        String validSecretKey = secretKey.trim();
        String validSmsType = (smsType != null && !smsType.isBlank()) ? smsType.trim() : "2";

        // Nội dung phải khớp 100% template đã được nhà mạng duyệt cho Brandname Baotrixemay
        String content = "2".equals(validSmsType)
                ? (otp + " la ma xac minh dang ky Baotrixemay cua ban")
                : (otp + " la ma xac minh OTP cua ban cho ung dung SRAS. Ma co hieu luc trong 5 phut.");

        Map<String, Object> payload = new HashMap<>();
        payload.put("ApiKey", validApiKey);
        payload.put("SecretKey", validSecretKey);
        payload.put("Phone", normalizedPhone);
        payload.put("Content", content);
        payload.put("SmsType", validSmsType);
        payload.put("IsUnicode", "0");
        payload.put("RequestId", java.util.UUID.randomUUID().toString());

        // Type 8 (đầu số ngẫu nhiên) không dùng Brandname, Type 2/4 dùng Brandname
        if (!"8".equals(validSmsType) && brandname != null && !brandname.isBlank()) {
            payload.put("Brandname", brandname.trim());
        }
        if ("1".equals(sandbox)) {
            payload.put("Sandbox", "1");
        }

        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                String jsonBody = objectMapper.writeValueAsString(payload);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(ESMS_API_URL))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(15))
                        .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    JsonNode resJson = objectMapper.readTree(response.body());
                    String codeResult = resJson.path("CodeResult").asText();
                    if (!"100".equals(codeResult)) {
                        String errorMessage = resJson.path("ErrorMessage").asText();
                        log.warn("eSMS service returned code {}: {}", codeResult, errorMessage);
                    }
                } else {
                    log.warn("eSMS service HTTP error {}: {}", response.statusCode(), response.body());
                }
            } catch (Exception e) {
                log.warn("Could not connect to eSMS service: {}", e.getMessage());
            }
        });
    }
}
