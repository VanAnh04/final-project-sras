package com.sras.backend.entity;

import com.sras.backend.entity.enums.ComplaintStatus;
import com.sras.backend.entity.enums.ComplaintTargetType;
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

/** A complaint raised by a user against a garage, customer, or the platform. */
@Getter
@Setter
@Entity
@Table(name = "complaints")
public class Complaint extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id")
    private RescueRequest request;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdByUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private ComplaintTargetType targetType;

    @Column(name = "content", nullable = false, length = 2000)
    private String content;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    private ComplaintStatus status = ComplaintStatus.OPEN;

    @Column(name = "resolution", length = 2000)
    private String resolution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by_user_id")
    private User handledByUser;
}
