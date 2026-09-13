package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Append-only audit trail of money, order-status, approval, and account-lock changes. */
@Getter
@Setter
@Entity
@Table(name = "audit_logs")
public class AuditLog extends AppendOnlyEntity {

    /** Null if the system. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actorUser;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    /** Name of the affected table. */
    @Column(name = "entity_type", nullable = false, length = 30)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    /** JSON before the change. Never stores passwords, tokens, or card data. */
    @Column(name = "before_value", columnDefinition = "text")
    private String beforeValue;

    @Column(name = "after_value", columnDefinition = "text")
    private String afterValue;

    @Column(name = "trace_id", length = 36)
    private String traceId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;
}
