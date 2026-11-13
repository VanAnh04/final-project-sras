package com.sras.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sras.backend.exception.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;

/**
 * Thin client over Clerk's Backend API. After a Clerk token is verified, we use the Secret Key to
 * fetch the user's verified email/name/avatar (the default session token does not carry email).
 */
@Component
@Slf4j
public class ClerkUserApiClient {

    private final RestClient restClient;
    private final boolean secretKeyConfigured;
    // Tự parse JSON bằng Jackson 2 vì Spring Boot 4 (Spring 7) dùng Jackson 3 cho RestClient,
    // không deserialize được vào com.fasterxml.jackson.databind.JsonNode.
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ClerkUserApiClient(
            @Value("${app.clerk.api-base-url}") String baseUrl,
            @Value("${app.clerk.secret-key:}") String secretKey) {
        String trimmedKey = secretKey != null ? secretKey.trim() : "";
        this.secretKeyConfigured = !trimmedKey.isBlank();
        log.info("Khoi tao ClerkUserApiClient: baseUrl={}, secretKeyConfigured={}, keyPrefix={}",
                baseUrl, this.secretKeyConfigured,
                trimmedKey.length() > 8 ? trimmedKey.substring(0, 8) + "..." : "(none)");

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(15));

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", "Bearer " + trimmedKey)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("User-Agent", "SRAS-Backend")
                .build();
    }

    public ClerkUser fetchUser(String userId) {
        if (!secretKeyConfigured) {
            log.error("Clerk chưa cấu hình CLERK_SECRET_KEY — không thể gọi Clerk Backend API");
            throw new UnauthorizedException(
                    "Clerk chưa được cấu hình (thiếu CLERK_SECRET_KEY)");
        }
        log.info("Clerk fetchUser: dang goi GET /users/{}", userId);
        String json;
        try {
            // Lấy body dạng String (converter String luôn có sẵn, không phụ thuộc Jackson 2/3)
            json = restClient.get()
                    .uri("/users/{id}", userId)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException e) {
            // Lỗi HTTP từ Clerk (401 = secret key sai/khác instance, 404 = user không thuộc instance...)
            log.error("Clerk Backend API GET /users/{} that bai: status={} body={}",
                    userId, e.getStatusCode(), e.getResponseBodyAsString());
            throw new UnauthorizedException("Không lấy được thông tin tài khoản Google từ Clerk (Lỗi Clerk API: " + e.getStatusCode() + ")");
        } catch (Exception e) {
            log.error("Loi khi goi Clerk Backend API GET /users/{}: {} ({})", userId, e.getMessage(), e.getClass().getName());
            throw new UnauthorizedException("Không lấy được thông tin tài khoản Google từ Clerk (" + e.getMessage() + ")");
        }
        if (json == null || json.isBlank()) {
            log.error("Clerk tra ve body RONG cho GET /users/{}", userId);
            throw new UnauthorizedException("Không lấy được thông tin tài khoản Google từ Clerk");
        }
        JsonNode body;
        try {
            body = objectMapper.readTree(json);
        } catch (Exception e) {
            log.error("Khong doc duoc JSON tu Clerk cho /users/{}: {}", userId, e.getMessage());
            throw new UnauthorizedException("Không lấy được thông tin tài khoản Google từ Clerk");
        }
        try {
            return parse(body);
        } catch (UnauthorizedException e) {
            log.error("Clerk parse that bai userId={} body={}", userId, json);
            throw e;
        }
    }

    private ClerkUser parse(JsonNode u) {
        if (u == null) {
            throw new UnauthorizedException("Không lấy được thông tin tài khoản Google từ Clerk");
        }
        String primaryId = u.path("primary_email_address_id").asText(null);
        String email = null;
        JsonNode emails = u.path("email_addresses");
        if (emails.isArray()) {
            for (JsonNode e : emails) {
                if (primaryId != null && primaryId.equals(e.path("id").asText())) {
                    email = e.path("email_address").asText(null);
                    break;
                }
            }
            if (email == null && !emails.isEmpty()) {
                email = emails.get(0).path("email_address").asText(null);
            }
        }
        String fullName = (u.path("first_name").asText("") + " " + u.path("last_name").asText("")).trim();
        if (fullName.isEmpty()) {
            fullName = "Người dùng Google";
        }
        String avatarUrl = u.path("image_url").asText(null);
        return new ClerkUser(email, fullName, avatarUrl);
    }

    public record ClerkUser(String email, String fullName, String avatarUrl) {}
}
