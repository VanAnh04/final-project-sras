package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.Capability;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GaragePublicProfileResponse {
    private Long id;
    private String name;
    private String phone;
    private String address;
    private Double lat;
    private Double lng;
    private Capability capability;
    private Boolean isOnline;
    private Boolean autoAccept;
    private Boolean available; // true nếu có nhân viên & xe rảnh lúc này
    /** READY: Sẵn sàng (thợ rảnh, xe rảnh), NO_STAFF: Hết thợ, NO_VEHICLE: Hết xe cứu hộ, OFFLINE: Đóng cửa */
    private String availabilityStatus;

    // Đánh giá & uy tín
    private BigDecimal avgRating;
    private Integer ratingCount;
    private Integer totalOrders;
    private BigDecimal cancelRate;
    private OffsetDateTime memberSince;
    private Boolean isVerified;

    // Khoảng cách & chi phí cứu hộ ước tính từ vị trí khách
    private Double distanceKm;
    private Integer estimatedEtaMin;
    private Long estimatedRescueFee;

    // Điểm số đề xuất hệ thống
    private Double score;

    // Badges thông minh & thế mạnh
    private List<String> badges;
    private List<String> specialties;

    // Hình ảnh & cơ sở vật chất
    private String coverImageUrl;
    private List<String> photos;
    private Integer activeStaffCount;
    private Integer totalStaffCount;
    private Integer activeRescueVehicleCount;
    private Integer rescueVehicleCount;

    // Danh sách dịch vụ niêm yết
    private List<GarageServicePriceResponse> services;
}
