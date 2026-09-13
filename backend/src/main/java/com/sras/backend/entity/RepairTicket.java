package com.sras.backend.entity;

import com.sras.backend.entity.enums.RepairTicketStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/**
 * Workshop repair ticket — 1–1 with a towed-in request. Handles item ③ (paid directly to the
 * garage, no commission); auto-created when the vehicle arrives and the rescue order completes.
 */
@Getter
@Setter
@Entity
@Table(name = "repair_tickets", indexes = @Index(
        name = "idx_repair_tickets_garage_status", columnList = "garage_id, status"))
public class RepairTicket extends BaseEntity {

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rescue_request_id", nullable = false, unique = true)
    private RescueRequest rescueRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "garage_id", nullable = false)
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RepairTicketStatus status = RepairTicketStatus.RECEIVED;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @Column(name = "done_at")
    private OffsetDateTime doneAt;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    /** = sum of APPROVED phase=AT_GARAGE lines in rescue_request_items. Recorded only (DEC-11). */
    @Column(name = "total_amount", nullable = false)
    private Long totalAmount = 0L;
}
