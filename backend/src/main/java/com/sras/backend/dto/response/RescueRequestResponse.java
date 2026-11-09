package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.RequestPaymentMethod;
import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.VehicleType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Ảnh chụp trạng thái một yêu cầu cứu hộ — khách poll màn theo dõi bằng DTO này. */
@Data
@Builder
public class RescueRequestResponse {

    private Long id;
    private String code;
    private RescueStatus status;
    private VehicleType vehicleType;
    private String symptom;

    private Double pickupLat;
    private Double pickupLng;
    private String pickupAddress;
    private String locationNote;

    private RequestPaymentMethod paymentMethod;
    private Boolean cashConfirmedByCustomer;
    private String quoteStatus;
    private String quoteType;
    private String towingReason;
    private Boolean isTowing;

    private Long rescueFee;
    private Long towingFee;
    private Long serviceFee;
    private Long totalAmount;
    private Long minPayableAmount;
    private Long inspectionFee;
    private Long repairFee;
    private BigDecimal dispatchDistanceKm;

    private OffsetDateTime createdAt;
    private OffsetDateTime enRouteAt;
    private OffsetDateTime arrivedAt;
    private OffsetDateTime completedAt;

    /** Vị trí xe cứu hộ theo thời gian thực (khách poll để cập nhật marker trên map). */
    private Double rescuerLat;
    private Double rescuerLng;
    private OffsetDateTime rescuerLocationAt;

    private CustomerInfo customer;

    /** Có sau khi gara đồng ý. */
    private GarageInfo garage;

    /** Có sau khi gara gán nhân viên. */
    private StaffInfo staff;
    private RescueVehicleInfo rescueVehicle;

    private List<String> photos;
    private List<String> customerPhotos;
    private List<String> diagnosisPhotos;
    private List<RescueRequestItemResponse> repairItems;
    private String cancelReason;
    private OffsetDateTime cancelledAt;
    private String cancelledBy;
    private CustomerVehicleInfo customerVehicle;
    private String customerIpAddress;
    private String deviceId;

    private OffsetDateTime bomReportedAt;
    private Integer bomWaitingMinutes;
    private String bomReason;
    private String bomPhotoUrl;
    private String customerCounterExplanation;
    private String customerCounterPhotoUrl;
    private Long gasCompensationAmount;
    private String gasCompensationStatus;

    /** Bắt buộc nộp tiền cọc chống boom đơn (từ đơn thứ 3). */
    private Boolean depositRequired;
    private Long depositAmount;
    private String depositStatus;
    private String depositPaymentLink;
    private OffsetDateTime depositPaidAt;

    /** Khách hàng đã đánh giá dịch vụ cho đơn này hay chưa (truy xuất từ bảng ratings). */
    private Boolean rated;

    @Data
    @Builder
    public static class CustomerVehicleInfo {
        private Long id;
        private String licensePlate;
        private String brand;
        private String model;
        private String color;
        private String vehicleType;
    }

    @Data
    @Builder
    public static class RescueRequestItemResponse {
        private Long id;
        private Long serviceId;
        private String name;
        private Long price;
        private Short quantity;
        private Long amount;
        private String status;
    }

    @Data
    @Builder
    public static class CustomerInfo {
        private Long id;
        private String name;
        private String phone;
    }

    @Data
    @Builder
    public static class GarageInfo {
        private Long id;
        private String name;
        private String phone;
        private String address;
        /** Điểm trung bình thật của gara (1–5); null nếu chưa có đánh giá nào. */
        private BigDecimal avgRating;
        /** Số lượt đánh giá thật của gara. */
        private Integer ratingCount;
        private Double lat;
        private Double lng;
    }

    @Data
    @Builder
    public static class StaffInfo {
        private Long id;
        private String name;
        private String phone;
        /** Điểm trung bình thật của nhân viên cứu hộ (1–5); null nếu chưa có đánh giá. */
        private BigDecimal rating;
        /** Số lượt đánh giá thật của nhân viên. */
        private Integer ratingCount;
    }

    @Data
    @Builder
    public static class RescueVehicleInfo {
        private Long id;
        private String licensePlate;
        private String vehicleKind;
    }
}
