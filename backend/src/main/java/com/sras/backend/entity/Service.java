package com.sras.backend.entity;

import com.sras.backend.entity.enums.FeeType;
import com.sras.backend.entity.enums.ServiceUnit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** A standard service with an admin-defined min–max price band (DEC-04, DEC-21). */
@Getter
@Setter
@Entity
@Table(name = "services")
public class Service extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private ServiceCategory category;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "fee_type", nullable = false, length = 20)
    private FeeType feeType;

    @Column(name = "min_price", nullable = false)
    private Long minPrice;

    @Column(name = "max_price", nullable = false)
    private Long maxPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit", length = 20)
    private ServiceUnit unit;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
