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

    @Value("${esms.api-key:${ESMS_API_KEY:B8B88EDF980CFCEDDC5EE734BD99D0}}")
    private String apiKey;

    @Value("${esms.secret-key:${ESMS_SECRET_KEY:9340C22D7B9B7948515A9F98B28A66}}")
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
        log.info("📱 [eSMS Service] Yêu cầu gửi mã OTP {} đến SĐT: {}", otp, phone);

        if (phone == null || phone.isBlank()) {
            throw new BadRequestException("Số điện thoại nhận OTP không hợp lệ.");
        }

        // Chuẩn hóa số điện thoại sang định dạng 0xxxxxxxxx
        String normalizedPhone = phone.trim();
        if (normalizedPhone.startsWith("+84")) {
            normalizedPhone = "0" + normalizedPhone.substring(3);
        } else if (normalizedPhone.startsWith("84") && normalizedPhone.length() >= 11) {
            normalizedPhone = "0" + normalizedPhone.substring(2);
        }

        String validApiKey = (apiKey != null && !apiKey.isBlank()) ? apiKey.trim() : "B8B88EDF980CFCEDDC5EE734BD99D0";
        String validSecretKey = (secretKey != null && !secretKey.isBlank()) ? secretKey.trim() : "9340C22D7B9B7948515A9F98B28A66";
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

        try {
            String jsonBody = objectMapper.writeValueAsString(payload);
            log.info("📱 [eSMS Service] Gửi payload tới eSMS: Phone={}, SmsType={}, Brandname={}, Sandbox={}", 
                    normalizedPhone, validSmsType, payload.get("Brandname"), payload.get("Sandbox"));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ESMS_API_URL))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            log.info("📱 [eSMS Service] eSMS Response Code: {}, Body: {}", response.statusCode(), response.body());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode resJson = objectMapper.readTree(response.body());
                String codeResult = resJson.path("CodeResult").asText();
                String errorMessage = resJson.path("ErrorMessage").asText();

                if ("100".equals(codeResult)) {
                    log.info("✅ [eSMS Service] Gửi OTP thành công tới SĐT: {} (SMSID: {})",
                            normalizedPhone, resJson.path("SMSID").asText());
                } else {
                    log.warn("⚠️ [eSMS Service] Cổng eSMS trả về CodeResult: {}, ErrorMessage: {}", codeResult, errorMessage);
                    log.info("🔑 [Demo OTP Fallback] SĐT: {} | Mã OTP: {} (Xem mã này trên log console để nhập)", normalizedPhone, otp);
                }
            } else {
                log.warn("⚠️ [eSMS Service] HTTP Error {}: {}", response.statusCode(), response.body());
                log.info("🔑 [Demo OTP Fallback] SĐT: {} | Mã OTP: {} (Xem mã này trên log console để nhập)", normalizedPhone, otp);
            }
        } catch (Exception e) {
            log.warn("⚠️ [eSMS Connection Warning] Không thể kết nối cổng SMS eSMS.vn ({}: {}).", 
                    e.getClass().getSimpleName(), e.getMessage());
            log.info("🔑 [Demo OTP Fallback] SĐT: {} | Mã OTP: {} (Xem mã này trên log console để nhập)", normalizedPhone, otp);
        }
    }
}
