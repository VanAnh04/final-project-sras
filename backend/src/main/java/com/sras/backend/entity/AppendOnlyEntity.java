package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * Base for append-only tables (DATABASE.md §2 exceptions): rows are inserted, never updated
 * or soft-deleted, so there is no {@code updated_at} / {@code is_deleted}.
 *
 * <p>Applies to {@code rescue_status_history}, {@code location_tracks},
 * {@code wallet_transactions}, {@code audit_logs}, {@code ai_messages}.
 */
@Getter
@Setter
@MappedSuperclass
public abstract class AppendOnlyEntity {

    /** {@code bigserial} primary key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
