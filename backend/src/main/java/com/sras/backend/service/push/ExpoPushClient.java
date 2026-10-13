package com.sras.backend.service.push;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gửi push qua Expo Push Service ({@code https://exp.host/--/api/v2/push/send}).
 * Expo tự chuyển tiếp sang FCM (Android) / APNs (iOS) nên backend không cần SDK Firebase.
 */
@Component
@Slf4j
public class ExpoPushClient {

    private static final String SEND_URL = "https://exp.host/--/api/v2/push/send";
    /** Expo giới hạn 100 message mỗi request. */
    private static final int BATCH_SIZE = 100;

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExpoPushClient(@Value("${app.push.expo-access-token:}") String accessToken) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(10));
        factory.setReadTimeout(Duration.ofSeconds(15));

        RestClient.Builder builder = RestClient.builder()
                .requestFactory(factory)
                .defaultHeader("Accept", "application/json")
                .defaultHeader("Accept-Encoding", "identity");
        String token = accessToken != null ? accessToken.trim() : "";
        if (!token.isBlank()) {
            // Chỉ cần khi bật "Enhanced Security for Push Notifications" trên Expo.
            builder.defaultHeader("Authorization", "Bearer " + token);
        }
        this.restClient = builder.build();
    }

    /** Kết quả gửi: số ticket thành công + các token Expo báo đã chết (cần vô hiệu). */
    public record Result(int okCount, List<String> deadTokens) {}

    public Result send(List<String> tokens, String title, String body, Map<String, Object> data) {
        int ok = 0;
        List<String> dead = new ArrayList<>();
        for (int i = 0; i < tokens.size(); i += BATCH_SIZE) {
            List<String> batch = tokens.subList(i, Math.min(tokens.size(), i + BATCH_SIZE));
            Result r = sendBatch(batch, title, body, data);
            ok += r.okCount();
            dead.addAll(r.deadTokens());
        }
        return new Result(ok, dead);
    }

    private Result sendBatch(List<String> tokens, String title, String body, Map<String, Object> data) {
        List<Map<String, Object>> messages = new ArrayList<>();
        for (String to : tokens) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("to", to);
            m.put("title", title);
            m.put("body", body);
            m.put("sound", "default");
            m.put("priority", "high");
            m.put("channelId", "default");
            if (data != null && !data.isEmpty()) m.put("data", data);
            messages.add(m);
        }

        String json;
        try {
            json = restClient.post()
                    .uri(SEND_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(messages))
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            // Không log token. Lỗi mạng/HTTP chỉ làm mất push, không ảnh hưởng nghiệp vụ.
            log.warn("Gửi Expo push thất bại ({} thiết bị): {}", tokens.size(), e.getMessage());
            return new Result(0, List.of());
        }

        int ok = 0;
        List<String> dead = new ArrayList<>();
        try {
            JsonNode tickets = objectMapper.readTree(json).path("data");
            // Ticket trả về đúng thứ tự message đã gửi.
            for (int i = 0; i < tickets.size() && i < tokens.size(); i++) {
                JsonNode t = tickets.get(i);
                if ("ok".equals(t.path("status").asText())) {
                    ok++;
                } else {
                    String err = t.path("details").path("error").asText("");
                    if ("DeviceNotRegistered".equals(err)) {
                        dead.add(tokens.get(i));
                    }
                    // message của Expo chứa nguyên token → che đi trước khi log.
                    String msg = t.path("message").asText("").replaceAll("ExponentPushToken\\[[^\\]]*\\]", "ExponentPushToken[***]");
                    log.warn("Expo push ticket lỗi: {} {}", err, msg);
                }
            }
        } catch (Exception e) {
            log.warn("Không đọc được phản hồi Expo push: {}", e.getMessage());
        }
        return new Result(ok, dead);
    }
}
