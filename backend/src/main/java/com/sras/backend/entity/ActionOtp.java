package com.sras.backend.entity;

import com.sras.backend.entity.enums.ActionOtpPurpose;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * OTP xác thực một thao tác cụ thể (đổi STK, rút tiền). Tách khỏi {@code otp_codes} của đăng nhập để OTP
 * đăng nhập không dùng được cho rút tiền và ngược lại.
 *
 * <p>Không lưu mã thô: {@code code_hash} = HMAC(secret, mã). {@code payload_hash} gắn OTP với đúng nội dung
 * thao tác (số tiền, STK…) — OTP xin cho rút 100.000đ không dùng được để rút 20.000.000đ.
 */
@Getter
@Setter
@Entity
@Table(name = "action_otps", indexes = @Index(name = "idx_action_otps_user_purpose", columnList = "user_id, purpose"))
public class ActionOtp extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 30)
    private ActionOtpPurpose purpose;

    @Column(name = "code_hash", nullable = false, length = 64)
    private String codeHash;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "attempts", nullable = false)
    private Integer attempts = 0;

    /** Đã dùng (hoặc bị vô hiệu) — không bao giờ dùng lại được. */
    @Column(name = "used_at")
    private OffsetDateTime usedAt;
}
