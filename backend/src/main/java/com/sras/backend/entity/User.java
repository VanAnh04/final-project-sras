package com.sras.backend.entity;

import com.sras.backend.entity.enums.UserRole;
import com.sras.backend.entity.enums.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/** Every system user, distinguished by {@link UserRole}. */
@Getter
@Setter
@Entity
@Table(name = "users", indexes = @Index(name = "uq_users_phone", columnList = "phone", unique = true))
public class User extends BaseEntity {

    @Column(name = "phone", nullable = false, length = 15)
    private String phone;

    @Column(name = "password_hash", nullable = false, length = 72)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status = UserStatus.ACTIVE;

    /** Debt in VND; {@code > 0} blocks new orders (DEC-20). CHECK &gt;= 0 enforced in DB. */
    @Column(name = "debt_amount", nullable = false)
    private Long debtAmount = 0L;

    @Column(name = "is_blocked_by_debt", nullable = false)
    private Boolean isBlockedByDebt = false;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;
}
