package com.sras.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.Map;

@Getter
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class PhoneNotVerifiedException extends RuntimeException {
    private final String phone;

    public PhoneNotVerifiedException(String phone, String message) {
        super(message);
        this.phone = phone;
    }

    public Map<String, Object> getData() {
        return Map.of(
            "requiresPhoneVerification", true,
            "phone", phone != null ? phone : ""
        );
    }
}
