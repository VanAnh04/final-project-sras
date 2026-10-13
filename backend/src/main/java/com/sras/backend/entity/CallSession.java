package com.sras.backend.entity;

import com.sras.backend.entity.enums.CallStatus;
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

import java.time.OffsetDateTime;

/**
 * Nhật ký một cuộc gọi thoại giữa hai người tham gia cùng một đơn cứu hộ. Chỉ lưu thông tin cuộc gọi
 * (ai gọi ai, trạng thái, thời lượng) — không ghi âm, không lưu nội dung.
 */
@Getter
@Setter
@Entity
@Table(name = "call_sessions", indexes = {
        @Index(name = "idx_call_sessions_status", columnList = "status"),
        @Index(name = "idx_call_sessions_caller_status", columnList = "caller_id, status"),
        @Index(name = "idx_call_sessions_callee_status", columnList = "callee_id, status"),
        @Index(name = "idx_call_sessions_request", columnList = "rescue_request_id")
})
public class CallSession extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rescue_request_id", nullable = false)
    private RescueRequest rescueRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "caller_id", nullable = false)
    private User caller;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "callee_id", nullable = false)
    private User callee;

    /** Vai của người gọi trong đơn: CUSTOMER / GARAGE / STAFF. */
    @Column(name = "caller_role", length = 16, nullable = false)
    private String callerRole;

    /** Vai của người nhận trong đơn: CUSTOMER / GARAGE / STAFF. */
    @Column(name = "callee_role", length = 16, nullable = false)
    private String calleeRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private CallStatus status = CallStatus.RINGING;

    @Column(name = "answered_at")
    private OffsetDateTime answeredAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    /** Số giây nói chuyện (từ lúc nghe máy); chỉ có khi cuộc gọi từng ONGOING. */
    @Column(name = "duration_sec")
    private Integer durationSec;

    /** Người bấm kết thúc; null = hệ thống (hết giờ đổ chuông, mất kết nối). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ended_by_id")
    private User endedBy;
}
