package com.sras.backend.entity;

import com.sras.backend.entity.enums.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

/** An AI assistant conversation (R-07). */
@Getter
@Setter
@Entity
@Table(name = "ai_conversations")
public class AiConversation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", length = 10)
    private VehicleType vehicleType;

    @Column(name = "title", length = 150)
    private String title;

    @Column(name = "issue_group", length = 50)
    private String issueGroup;

    @Column(name = "converted_to_request", nullable = false)
    private Boolean convertedToRequest = false;

    @Column(name = "customer_last_read_at")
    private OffsetDateTime customerLastReadAt;

    @Column(name = "staff_last_read_at")
    private OffsetDateTime staffLastReadAt;
}
