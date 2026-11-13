package com.sras.backend.dto.request;

import lombok.Data;

@Data
public class RefreshTokenRequest {
    private String token;
    private String refreshToken;
}
