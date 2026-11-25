package com.sras.backend.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Tiện ích chuẩn hóa số điện thoại Việt Nam (+84 / 84 <-> 0...). */
public final class PhoneUtils {

    private PhoneUtils() {
    }

    /**
     * Chuẩn hóa SĐT Việt Nam về dạng 10 số bắt đầu bằng {@code 0}.
     * Giữ nguyên các chuỗi đặc biệt (ví dụ {@code DEL_...}) hoặc SĐT không thuộc đầu số VN.
     */
    public static String normalizeVnPhone(String raw) {
        if (raw == null) {
            return null;
        }
        String s = raw.trim();
        if (s.isEmpty() || s.regionMatches(true, 0, "DEL_", 0, 4)) {
            return s;
        }
        String cleaned = s.replaceAll("[\\s\\-.]", "");
        if (cleaned.matches("^\\+84[0-9]{9}$")) {
            return "0" + cleaned.substring(3);
        }
        if (cleaned.matches("^84[0-9]{9}$")) {
            return "0" + cleaned.substring(2);
        }
        return cleaned;
    }

    /**
     * Trả về danh sách các biến thể tương đương ({@code 0...}, {@code +84...}, {@code 84...})
     * để kiểm tra trùng lặp và tìm kiếm khớp cả dữ liệu cũ trong DB.
     */
    public static List<String> phoneVariants(String raw) {
        String norm = normalizeVnPhone(raw);
        if (norm == null || norm.isBlank()) {
            return List.of();
        }
        Set<String> variants = new LinkedHashSet<>();
        variants.add(norm);
        String trimmed = raw.trim();
        if (!trimmed.isEmpty()) {
            variants.add(trimmed);
        }
        if (norm.matches("^0[0-9]{9}$")) {
            String tail = norm.substring(1);
            variants.add("+84" + tail);
            variants.add("84" + tail);
        }
        return new ArrayList<>(variants);
    }
}

