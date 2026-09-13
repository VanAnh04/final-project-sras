package com.sras.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

/**
 * Common columns shared by standard business tables (DATABASE.md §2):
 * {@code id}, {@code created_at}, {@code updated_at}, {@code is_deleted}.
 *
 * <p>Timestamps are managed by Hibernate ({@link CreationTimestamp} / {@link UpdateTimestamp}),
 * so JPA auditing does not need to be enabled. Append-only tables that lack
 * {@code updated_at}/{@code is_deleted} use {@link AppendOnlyEntity} instead.
 */
@Getter
@Setter
@MappedSuperclass
public abstract class BaseEntity {

    /** {@code bigserial} primary key. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;
}
