package com.sras.backend.entity;

import com.sras.backend.entity.enums.CancelledBy;
import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** The central table of the system. State machine: ARCHITECTURE.md §6. */
@Getter
@Setter
@Entity
@Table(name = "rescue_requests", indexes = {
        @Index(name = "idx_rescue_requests_customer_created", columnList = "customer_id, created_at DESC"),
        @Index(name = "idx_rescue_requests_garage_status", columnList = "garage_id, status")
})
public class RescueRequest extends BaseEntity {

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_vehicle_id")
    private CustomerVehicle customerVehicle;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 10)
    private VehicleType vehicleType;

    @Column(name = "symptom", nullable = false, length = 1000)
    private String symptom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_conversation_id")
    private AiConversation aiConversation;

    @Column(name = "pickup_lat", nullable = false)
    private Double pickupLat;

    @Column(name = "pickup_lng", nullable = false)
    private Double pickupLng;

    @Column(name = "pickup_address", length = 255)
    private String pickupAddress;

    @Column(name = "location_note", length = 255)
    private String locationNote;

    /** Loại sự cố có cấu trúc do khách chọn (OUT_OF_FUEL, FLAT_TIRE, ...). Nullable để an toàn với dữ liệu cũ. */
    @Column(name = "issue_type", length = 30)
    private String issueType;

    /** SĐT liên hệ cho ca cứu hộ này (mặc định = SĐT tài khoản, khách sửa được). */
    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private RequestPaymentMethod paymentMethod;

    /** Đánh dấu khách hàng đã bấm xác nhận thanh toán tiền mặt trực tiếp trên app. */
    @Column(name = "cash_confirmed_by_customer")
    private Boolean cashConfirmedByCustomer = false;

    /** Trạng thái duyệt báo giá: PENDING (chờ duyệt), ACCEPTED / APPROVED (đồng ý), DECLINED (từ chối). */
    @Column(name = "quote_status", length = 20)
    private String quoteStatus;

    /** Loại báo giá: ONSITE (sửa tại chỗ) hoặc TOW (kéo về garage). */
    @Column(name = "quote_type", length = 20)
    private String quoteType = "ONSITE";

    /** Lý do đề xuất kéo xe về garage. */
    @Column(name = "towing_reason", length = 500)
    private String towingReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 25)
    private RescueStatus status = RescueStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garage_id")
    private Garage garage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    private GarageStaff staff;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rescue_vehicle_id")
    private RescueVehicle rescueVehicle;

    @Column(name = "search_radius_km", nullable = false)
    private Short searchRadiusKm = 15;

    @Column(name = "is_radius_expanded", nullable = false)
    private Boolean isRadiusExpanded = false;

    @Column(name = "dispatch_distance_km", precision = 6, scale = 2)
    private BigDecimal dispatchDistanceKm;

    /** Item ① — fixed when the customer picks a garage. Computed server-side, never from client. */
    @Column(name = "rescue_fee")
    private Long rescueFee;

    /** Item ② estimate (ceiling for {@code towing_fee}). */
    @Column(name = "quoted_towing_fee")
    private Long quotedTowingFee;

    /** Item ② actual — fixed when the customer agrees to tow. */
    @Column(name = "towing_fee")
    private Long towingFee;

    /** Item ③ on-site — sum of APPROVED phase=ONSITE lines in rescue_request_items. */
    @Column(name = "service_fee")
    private Long serviceFee;

    /** = ① + ②. */
    @Column(name = "total_amount")
    private Long totalAmount;

    @Column(name = "commission_rate", precision = 6, scale = 3)
    private BigDecimal commissionRate;

    @Column(name = "commission_amount")
    private Long commissionAmount;

    @Column(name = "tax_rate", precision = 6, scale = 3)
    private BigDecimal taxRate;

    @Column(name = "tax_amount")
    private Long taxAmount;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancelled_by", length = 20)
    private CancelledBy cancelledBy;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "is_cancel_fee_charged", nullable = false)
    private Boolean isCancelFeeCharged = false;

    /** ★ Cancellation-fee checkpoint — evidence paired with GPS. */
    @Column(name = "en_route_at")
    private OffsetDateTime enRouteAt;

    @Column(name = "en_route_lat")
    private Double enRouteLat;

    @Column(name = "en_route_lng")
    private Double enRouteLng;

    /** Vị trí xe cứu hộ theo thời gian thực (nhân viên/gara đẩy lên khi đang đi cứu hộ). */
    @Column(name = "rescuer_lat")
    private Double rescuerLat;

    @Column(name = "rescuer_lng")
    private Double rescuerLng;

    @Column(name = "rescuer_location_at")
    private OffsetDateTime rescuerLocationAt;

    /** Vị trí khách khi đang bật chia sẻ, chỉ tồn tại lúc đơn ở ASSIGNED/EN_ROUTE. */
    @Column(name = "customer_lat")
    private Double customerLat;

    @Column(name = "customer_lng")
    private Double customerLng;

    @Column(name = "customer_location_at")
    private OffsetDateTime customerLocationAt;

    /** Điểm xe cứu hộ tới thay cho điểm đón khi khách đã đi xa điểm đón; null là vẫn tới điểm đón. */
    @Column(name = "meet_lat")
    private Double meetLat;

    @Column(name = "meet_lng")
    private Double meetLng;

    /** Đã báo nhân viên một lần, bật lại chia sẻ trong cùng đơn thì không báo nữa. */
    @Column(name = "customer_share_notified")
    private Boolean customerShareNotified;

    @Column(name = "arrived_at")
    private OffsetDateTime arrivedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "bom_reported_at")
    private OffsetDateTime bomReportedAt;

    @Column(name = "bom_waiting_minutes")
    private Integer bomWaitingMinutes;

    @Column(name = "bom_reason", length = 500)
    private String bomReason;

    @Column(name = "bom_photo_url", length = 500)
    private String bomPhotoUrl;

    @Column(name = "customer_counter_explanation", length = 2000)
    private String customerCounterExplanation;

    @Column(name = "customer_counter_photo_url", length = 500)
    private String customerCounterPhotoUrl;

    @Column(name = "gas_compensation_amount")
    private Long gasCompensationAmount;

    /** Trạng thái bồi hoàn xăng xe: AUTO_CREDITED, PENDING_APPROVAL, APPROVED, REJECTED */
    @Column(name = "gas_compensation_status", length = 30)
    private String gasCompensationStatus;

    /** Optimistic lock — prevents two garages accepting at once (E-02, ADR-16). */
    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;
}
