package com.sras.backend.entity;

import com.sras.backend.entity.enums.Capability;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A service group defined by the admin. */
@Getter
@Setter
@Entity
@Table(name = "service_categories")
public class ServiceCategory extends BaseEntity {

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 10)
    private Capability vehicleType;

    @Column(name = "display_order", nullable = false)
    private Short displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
