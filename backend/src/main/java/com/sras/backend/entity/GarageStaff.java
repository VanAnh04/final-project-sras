package com.sras.backend.entity;

import com.sras.backend.entity.enums.WorkStatus;
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

/** A staff member employed by a garage (D-6). */
@Getter
@Setter
@Entity
@Table(name = "garage_staff", indexes = @Index(
        name = "uq_garage_staff_garage_user", columnList = "garage_id, user_id", unique = true))
public class GarageStaff extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "staff_code", length = 20)
    private String staffCode;

    /** {@code FREE}/{@code BUSY} — set by the system, never manually (G-08). */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private WorkStatus status = WorkStatus.FREE;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
