package com.sras.backend.websocket;

/**
 * Dựng JSON thủ công cho payload đẩy qua WebSocket (chat, cuộc gọi) — tránh lệ thuộc cấu hình
 * ObjectMapper. Các hàm trả về literal JSON; giá trị null thành {@code null}.
 */
public final class WsJson {

    private WsJson() {
    }

    /** Chuỗi JSON đã escape (có dấu ngoặc kép), hoặc {@code null} nếu {@code s} null. */
    public static String str(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append("\"").toString();
    }

    /** Số JSON, hoặc {@code null} nếu {@code n} null. */
    public static String num(Number n) {
        return n == null ? "null" : n.toString();
    }

    /** Boolean JSON, hoặc {@code null} nếu {@code b} null. */
    public static String bool(Boolean b) {
        return b == null ? "null" : b.toString();
    }
}
