package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.ComplaintStatus;
import com.sras.backend.entity.enums.ComplaintTargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintResponse {
    private Long id;
    private Long requestId;
    private String requestCode;
    private Long createdByUserId;
    private String createdByUserName;
    private String createdByUserPhone;
    private ComplaintTargetType targetType;
    private String content;
    private String attachmentUrl;
    private ComplaintStatus status;
    private String resolution;
    private Long handledByUserId;
    private String handledByUserName;
    private Long garageId;
    private String garageName;
    private String customerCounterExplanation;
    private String customerCounterAttachmentUrl;
    private OffsetDateTime customerCounteredAt;
    private Long suggestedCompensationAmount;
    private Long approvedCompensationAmount;
    private OffsetDateTime arrivedAt;
    private OffsetDateTime bomReportedAt;
    private Integer bomWaitingMinutes;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // === Thông tin mở rộng phục vụ Giám sát & Đối soát Admin ===
    // 1. Phía Khách hàng
    private String customerName;
    private String customerPhone;

    // 2. Phía Gara & Chủ gara
    private String garagePhone;
    private String garageAddress;
    private String garageOwnerName;
    private String garageOwnerPhone;
    private Double garageLat;
    private Double garageLng;

    // 3. Phía Kỹ thuật viên / Thợ cứu hộ được điều phối
    private Long staffId;
    private String staffName;
    private String staffPhone;
    private String rescueVehiclePlate;

    // 4. Chi tiết đơn hàng cứu hộ
    private String orderStatus;
    private Long orderTotalAmount;
    private Long orderRescueFee;
    private Long orderTowingFee;
    private String vehicleType;
    private String customerVehiclePlate;
    private String customerVehicleModel;
    private String symptom;
    private String pickupAddress;
    private Double pickupLat;
    private Double pickupLng;

    // 5. Giám sát hành trình di chuyển & thời gian nhân viên
    private OffsetDateTime enRouteAt;
    private Double enRouteLat;
    private Double enRouteLng;
    private Double rescuerLat;
    private Double rescuerLng;
    private OffsetDateTime completedAt;
    private String cancelReason;
    private String cancelledBy;
}
