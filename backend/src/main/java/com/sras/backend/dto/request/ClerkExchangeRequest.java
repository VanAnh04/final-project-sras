package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClerkExchangeRequest {

    @NotBlank(message = "Clerk token is required")
    private String clerkToken;

    private String email;
    private String fullName;
    private String avatarUrl;
}
