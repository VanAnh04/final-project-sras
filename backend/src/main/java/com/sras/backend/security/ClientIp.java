package com.sras.backend.security;

import jakarta.servlet.http.HttpServletRequest;

/** IP người gọi để ghi audit log. Chỉ dùng để truy vết — X-Forwarded-For giả mạo được, không dùng để phân quyền. */
public final class ClientIp {

    private ClientIp() {
    }

    public static String of(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
        return ip != null && ip.length() > 45 ? ip.substring(0, 45) : ip;
    }
}
