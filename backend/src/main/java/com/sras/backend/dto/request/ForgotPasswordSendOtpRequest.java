package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordSendOtpRequest {

    @NotBlank(message = "Số điện thoại hoặc email không được để trống")
    private String identifier;
}
