package com.sras.backend.dto.request;

import lombok.Data;

@Data
public class LoginRequest {

    // phone hoặc email (một trong hai)
    private String phone;
    private String email;

    private String password;

    private Boolean rememberMe;
}
