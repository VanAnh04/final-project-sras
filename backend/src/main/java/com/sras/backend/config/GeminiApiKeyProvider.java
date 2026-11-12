package com.sras.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Quản lý danh sách Gemini API Key (Key Pool & Failover).
 * Cho phép cấu hình nhiều API Key phân tách bằng dấu phẩy (,).
 * Tự động chuyển đổi sang key kế tiếp khi gặp lỗi 429 (hết quota) hoặc 503 (model quá tải).
 */
@Slf4j
@Component
public class GeminiApiKeyProvider {

    private final List<String> apiKeys = new ArrayList<>();
    private final AtomicInteger currentIndex = new AtomicInteger(0);

    public GeminiApiKeyProvider(@Value("${gemini.api-key:}") String apiKeyConfig) {
        if (StringUtils.hasText(apiKeyConfig)) {
            String[] parts = apiKeyConfig.split("[,;\\s]+");
            for (String part : parts) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty() && !apiKeys.contains(trimmed)) {
                    apiKeys.add(trimmed);
                }
            }
        }
        if (apiKeys.isEmpty()) {
            log.warn("[GeminiApiKeyProvider] Chưa có Gemini API key nào được cấu hình!");
        } else {
            log.info("[GeminiApiKeyProvider] Đã nạp thành công {} Gemini API key(s) vào danh sách luân chuyển", apiKeys.size());
            for (int i = 0; i < apiKeys.size(); i++) {
                log.info("  -> Key #{}: {}", i + 1, maskKey(apiKeys.get(i)));
            }
        }
    }

    public boolean hasKeys() {
        return !apiKeys.isEmpty();
    }

    public int getKeyCount() {
        return apiKeys.size();
    }

    public List<String> getKeys() {
        return Collections.unmodifiableList(apiKeys);
    }

    public String getCurrentKey() {
        if (apiKeys.isEmpty()) return "";
        int idx = Math.abs(currentIndex.get()) % apiKeys.size();
        return apiKeys.get(idx);
    }

    public String rotateToNextKey() {
        if (apiKeys.isEmpty()) return "";
        int nextIdx = Math.abs(currentIndex.incrementAndGet()) % apiKeys.size();
        String nextKey = apiKeys.get(nextIdx);
        log.info("[GeminiApiKeyProvider] Đã chuyển sang API key index #{}: {}", nextIdx + 1, maskKey(nextKey));
        return nextKey;
    }

    /**
     * Thực thi tác vụ gọi Gemini với cơ chế tự động chuyển đổi key (failover) khi gặp lỗi.
     */
    public <T> T executeWithFailover(GeminiCallable<T> callable) throws Exception {
        if (apiKeys.isEmpty()) {
            throw new IllegalStateException("Không có Gemini API key nào khả dụng!");
        }

        Exception lastException = null;
        int totalKeys = apiKeys.size();
        int startIndex = Math.abs(currentIndex.get()) % totalKeys;

        for (int i = 0; i < totalKeys; i++) {
            int keyIndex = (startIndex + i) % totalKeys;
            String key = apiKeys.get(keyIndex);

            try {
                T result = callable.call(key);
                // Thành công: ghim key này làm key mặc định cho các request tiếp theo
                currentIndex.set(keyIndex);
                return result;
            } catch (Exception ex) {
                lastException = ex;
                log.warn("[GeminiApiKeyProvider] Key #{} ({}) gặp lỗi: {}. Đang thử chuyển sang key tiếp theo...",
                        keyIndex + 1, maskKey(key), ex.getMessage());
                if (totalKeys == 1) {
                    throw ex;
                }
            }
        }

        throw new IllegalStateException(String.format(
                "Tất cả %d Gemini API key đều thất bại! Lỗi cuối cùng: %s",
                totalKeys, lastException != null ? lastException.getMessage() : "Unknown"), lastException);
    }

    public static String maskKey(String key) {
        if (key == null || key.length() < 10) return "***";
        return key.substring(0, 6) + "..." + key.substring(key.length() - 4);
    }

    @FunctionalInterface
    public interface GeminiCallable<T> {
        T call(String apiKey) throws Exception;
    }
}

