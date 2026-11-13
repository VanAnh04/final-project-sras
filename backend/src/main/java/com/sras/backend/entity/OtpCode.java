package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/** OTP codes used for phone verification. */
@Getter
@Setter
@Entity
@Table(name = "otp_codes", indexes = @Index(name = "idx_otp_codes_phone", columnList = "phone"))
public class OtpCode extends BaseEntity {

    @Column(name = "phone", nullable = false, length = 15)
    private String phone;

    @Column(name = "code", nullable = false, length = 6)
    private String code;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "used", nullable = false)
    private Boolean used = false;

    @Column(name = "wrong_attempts", nullable = false)
    private Integer wrongAttempts = 0;

    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;
}
