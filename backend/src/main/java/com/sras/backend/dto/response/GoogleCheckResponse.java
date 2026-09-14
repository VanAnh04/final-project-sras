package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleCheckResponse {
    private boolean exists;
    private String email;
    private String fullName;
    private String avatarUrl;
    private AuthResponse auth;
}
