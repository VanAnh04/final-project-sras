package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyOtpRequest {
    
    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank(message = "OTP code is required")
    private String otpCode;
}
