package com.sras.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class GoogleRegisterRequest {

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+?[0-9]{10,15}$", message = "Invalid phone number format")
    private String phone;

    @NotBlank(message = "OTP code is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "OTP must be 6 digits")
    private String otpCode;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String avatarUrl;
}
