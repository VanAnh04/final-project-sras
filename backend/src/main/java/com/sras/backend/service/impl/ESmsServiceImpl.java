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

    @Value("${esms.secret-key:${ESMS_SECRET_KEY:B8B88EDF980CFCEDDC5EE734BD99D0}}")
    private String secretKey;

    @Value("${esms.sms-type:${ESMS_SMS_TYPE:2}}")
    private String smsType;

    @Value("${esms.brandname:${ESMS_BRANDNAME:Baotrixemay}}")
    private String brandname;

    @Value("${esms.sandbox:${ESMS_SANDBOX:0}}")
    private String sandbox;

    private static final String ESMS_API_URL = "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .connectTimeout(Duration.ofSeconds(10))
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
        String validSecretKey = (secretKey != null && !secretKey.isBlank()) ? secretKey.trim() : "B8B88EDF980CFCEDDC5EE734BD99D0";
        String validSmsType = (smsType != null && !smsType.isBlank()) ? smsType.trim() : "2";

        String content = otp + " la ma xac minh OTP cua ban cho ung dung SRAS. Ma co hieu luc trong 5 phut.";

        Map<String, Object> payload = new HashMap<>();
        payload.put("ApiKey", validApiKey);
        payload.put("SecretKey", validSecretKey);
        payload.put("Phone", normalizedPhone);
        payload.put("Content", content);
        payload.put("SmsType", validSmsType);
        payload.put("IsUnicode", "0");

        // Type 8 (đầu số ngẫu nhiên) không dùng Brandname
        if (!"8".equals(validSmsType) && brandname != null && !brandname.isBlank()) {
            payload.put("Brandname", brandname.trim());
        }
        if ("1".equals(sandbox)) {
            payload.put("Sandbox", "1");
        }

        try {
            String jsonBody = objectMapper.writeValueAsString(payload);
            log.info("📱 [eSMS Service] Gửi payload tới eSMS: Phone={}, SmsType={}", normalizedPhone, validSmsType);

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
                    log.error("❌ [eSMS Service] Gửi OTP thất bại! CodeResult: {}, ErrorMessage: {}", codeResult, errorMessage);
                    if ("101".equals(codeResult)) {
                        throw new BadRequestException("Lỗi xác thực eSMS (Authorize Failed): Vui lòng kiểm tra lại API Key và Secret Key eSMS.");
                    } else if ("102".equals(codeResult)) {
                        throw new BadRequestException("Tài khoản eSMS không đủ số dư để gửi tin nhắn.");
                    } else if ("104".equals(codeResult)) {
                        throw new BadRequestException("Brandname eSMS chưa được đăng ký hoặc không hợp lệ.");
                    } else {
                        String detail = (errorMessage != null && !errorMessage.isBlank()) ? errorMessage : ("CodeResult " + codeResult);
                        throw new BadRequestException("Không thể gửi OTP qua eSMS (" + detail + ")");
                    }
                }
            } else {
                log.error("❌ [eSMS Service] HTTP Error {}: {}", response.statusCode(), response.body());
                throw new BadRequestException("Lỗi kết nối tới cổng eSMS (HTTP " + response.statusCode() + ")");
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("❌ [eSMS Service] Ngoại lệ khi gửi SMS: {}", e.getMessage(), e);
            String message = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            throw new BadRequestException("Lỗi hệ thống khi gửi tin nhắn OTP: " + message);
        }
    }
}
