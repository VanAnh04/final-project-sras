package com.sras.backend.entity;

import com.sras.backend.entity.enums.ActorType;
import com.sras.backend.entity.enums.RescueStatus;
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

/** Append-only log of rescue-request status transitions. */
@Getter
@Setter
@Entity
@Table(name = "rescue_status_history")
public class RescueStatusHistory extends AppendOnlyEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private RescueRequest request;

    /** Null for the first row. */
    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 25)
    private RescueStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 25)
    private RescueStatus toStatus;

    /** Null if driven by a system job. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_user_id")
    private User changedByUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20)
    private ActorType actorType;

    @Column(name = "note", length = 500)
    private String note;
}
