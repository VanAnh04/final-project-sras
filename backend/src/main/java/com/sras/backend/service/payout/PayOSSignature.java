package com.sras.backend.service.payout;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Hai kiểu ký của payOS — KHÔNG dùng lẫn được:
 * <ul>
 *   <li><b>Webhook thanh toán (tiền vào)</b>: sắp key {@code data} theo alphabet, ghép {@code key=value&…},
 *       null/"null"/"undefined" ⇒ rỗng, mảng ⇒ JSON (key từng phần tử đã sắp), KHÔNG URL-encode.</li>
 *   <li><b>Payout (tiền ra)</b>, theo SDK chính thức {@code payos-java} 2.x: sắp key đệ quy, null ⇒ rỗng,
 *       list / map khác rỗng ⇒ JSON, URL-encode cả key lẫn value ({@code +} ⇒ {@code %20}).</li>
 * </ul>
 * Cả hai đều HMAC-SHA256 bằng checksum key, xuất hex chữ thường.
 */
public final class PayOSSignature {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private PayOSSignature() {
    }

    // ───────────────────────────── Webhook thanh toán ─────────────────────────────

    /** Chuỗi được ký của {@code data} trong webhook / response thanh toán. */
    public static String paymentDataString(Map<String, Object> data) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> e : new TreeMap<>(data).entrySet()) {
            Object value = e.getValue();
            String str;
            if (value instanceof List<?> list) {
                str = toJson(sortListElements(list));
            } else if (value == null || "null".equals(value) || "undefined".equals(value)) {
                str = "";
            } else {
                str = String.valueOf(value);
            }
            if (sb.length() > 0) sb.append('&');
            sb.append(e.getKey()).append('=').append(str);
        }
        return sb.toString();
    }

    /**
     * Webhook payOS có chữ ký hợp lệ hay không. Thiếu {@code data}/{@code signature} hoặc thiếu key ⇒ false.
     */
    @SuppressWarnings("unchecked")
    public static boolean verifyPaymentWebhook(Map<String, Object> payload, String checksumKey) {
        if (payload == null || checksumKey == null || checksumKey.isBlank()) return false;
        Object data = payload.get("data");
        Object signature = payload.get("signature");
        if (!(data instanceof Map<?, ?>) || !(signature instanceof String sig) || sig.isBlank()) return false;
        String expected = hmacSha256Hex(checksumKey, paymentDataString((Map<String, Object>) data));
        return constantTimeEquals(expected, sig.toLowerCase());
    }

    // ───────────────────────────────── Payout ─────────────────────────────────

    /** Chuỗi được ký của body request / {@code data} response payout. */
    public static String payoutDataString(Map<String, Object> data) {
        Map<String, Object> sorted = deepSort(data);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> e : sorted.entrySet()) {
            Object value = e.getValue();
            String str;
            if (value == null) {
                str = "";
            } else if (value instanceof List<?> || (value instanceof Map<?, ?> m && !m.isEmpty())) {
                str = toJson(value);
            } else {
                str = String.valueOf(value);
            }
            if (sb.length() > 0) sb.append('&');
            sb.append(encode(e.getKey())).append('=').append(encode(str));
        }
        return sb.toString();
    }

    public static String signPayout(Map<String, Object> data, String checksumKey) {
        return hmacSha256Hex(checksumKey, payoutDataString(data));
    }

    public static boolean verifyPayout(Map<String, Object> data, String signature, String checksumKey) {
        if (data == null || signature == null || signature.isBlank() || checksumKey == null || checksumKey.isBlank()) {
            return false;
        }
        return constantTimeEquals(signPayout(data, checksumKey), signature.toLowerCase());
    }

    // ───────────────────────────────── Chung ─────────────────────────────────

    public static String hmacSha256Hex(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Không tạo được chữ ký HMAC-SHA256", e);
        }
    }

    /** So sánh thời gian hằng — không để lộ độ dài phần khớp qua thời gian phản hồi. */
    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> deepSort(Map<String, Object> obj) {
        Map<String, Object> out = new LinkedHashMap<>();
        new TreeMap<>(obj).forEach((k, v) -> {
            if (v instanceof Map<?, ?> m) {
                out.put(k, deepSort((Map<String, Object>) m));
            } else if (v instanceof List<?> list) {
                out.put(k, sortListElements(list));
            } else {
                out.put(k, v);
            }
        });
        return out;
    }

    /** Giữ nguyên thứ tự phần tử, chỉ sắp key bên trong các phần tử là object. */
    @SuppressWarnings("unchecked")
    private static List<Object> sortListElements(List<?> list) {
        List<Object> out = new ArrayList<>(list.size());
        for (Object item : list) {
            out.add(item instanceof Map<?, ?> m ? deepSort((Map<String, Object>) m) : item);
        }
        return out;
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không chuyển được dữ liệu ký sang JSON", e);
        }
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
