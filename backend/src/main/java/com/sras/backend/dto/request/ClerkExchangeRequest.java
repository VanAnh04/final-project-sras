package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClerkExchangeRequest {

    @NotBlank(message = "Clerk token is required")
    private String clerkToken;

    // Mobile vẫn gửi kèm để tương thích, nhưng backend KHÔNG dùng để xác định danh tính
    // (email/tên/avatar chỉ lấy từ token Clerk hoặc Clerk Backend API).
    private String email;
    private String fullName;
    private String avatarUrl;
}
