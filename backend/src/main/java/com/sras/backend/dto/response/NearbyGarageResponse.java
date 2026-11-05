package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.Capability;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyGarageResponse {
    private Long id;
    private String name;
    private String phone;
    private String address;
    private Double lat;
    private Double lng;
    private Capability capability;
    private Boolean isOnline;
    private Boolean autoAccept;
    private BigDecimal avgRating;
    private Integer ratingCount;
    private Double distanceKm;
    private Integer estimatedEtaMin;
    private Long estimatedRescueFee;
    /** true nếu gara có nhân viên rảnh và xe cứu hộ rảnh phù hợp */
    private Boolean available;
    /** READY: Sẵn sàng (thợ rảnh, xe rảnh), NO_STAFF: Hết thợ, NO_VEHICLE: Hết xe cứu hộ, OFFLINE: Đóng cửa */
    private String availabilityStatus;
    /** Số xe cứu hộ rảnh sẵn sàng xuất phát */
    private Integer activeRescueVehicleCount;

    /** Danh sách badges khác biệt hoá: "NEAREST", "FASTEST", "TOP_RATED", "BEST_PRICE", "VERIFIED", "READY_NOW" */
    private List<String> badges;

    /** Ảnh đại diện / mặt tiền xưởng */
    private String coverImageUrl;

    /** Danh sách 2-3 dịch vụ thế mạnh tiêu biểu */
    private List<String> specialties;

    /** Tổng số đơn đã thực hiện */
    private Integer totalOrders;

    /** Điểm số đề xuất hệ thống tính theo Weighted Sum Model (WSM [0, 100]) */
    private Double score;
}
