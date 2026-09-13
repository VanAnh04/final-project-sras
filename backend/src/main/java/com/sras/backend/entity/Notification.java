package com.sras.backend.entity;

import com.sras.backend.entity.enums.NotificationType;
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

/** In-app notification. */
@Getter
@Setter
@Entity
@Table(name = "notifications", indexes = @Index(
        name = "idx_notifications_user_read", columnList = "user_id, is_read, created_at DESC"))
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 40)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "body", nullable = false, length = 500)
    private String body;

    /** Object kind used by the app to navigate. */
    @Column(name = "ref_type", length = 20)
    private String refType;

    @Column(name = "ref_id")
    private Long refId;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "sent_via_fcm", nullable = false)
    private Boolean sentViaFcm = false;
}
