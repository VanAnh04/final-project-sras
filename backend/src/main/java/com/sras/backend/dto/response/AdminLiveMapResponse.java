package com.sras.backend.dto.response;

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
public class AdminLiveMapResponse {

    private SummaryStats summary;
    private List<LiveGarageItem> garages;
    private List<LiveIncidentItem> activeIncidents;
    private OffsetDateTime serverTime;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryStats {
        private int totalGarages;
        private int onlineGarages;
        private int offlineGarages;
        private int activeIncidentsCount;
        private int searchingIncidentsCount;
        private int enRouteIncidentsCount;
        private int onsiteIncidentsCount;
        private int activeRescuersCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LiveGarageItem {
        private Long id;
        private String name;
        private String phone;
        private String address;
        private Double lat;
        private Double lng;
        private String status;
        private Boolean isOnline;
        private String capability;
        private BigDecimal avgRating;
        private Integer ratingCount;
        private String ownerName;
        private String ownerPhone;
        private int totalStaff;
        private int freeStaff;
        private int busyStaff;
        private int activeOrdersCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LiveIncidentItem {
        private Long id;
        private String code;
        private String status;
        private String vehicleType;
        private String issueType;
        private String symptom;
        private String quoteType;

        // Vị trí đơn cứu hộ (Khách hàng)
        private Double pickupLat;
        private Double pickupLng;
        private String pickupAddress;
        private Double customerLat;
        private Double customerLng;
        private Double meetLat;
        private Double meetLng;

        // Vị trí xuất phát & Vị trí thời gian thực của Nhân viên cứu hộ
        private Double enRouteLat;
        private Double enRouteLng;
        private Double rescuerLat;
        private Double rescuerLng;
        private OffsetDateTime rescuerLocationAt;
        private Long rescuerLocationAgeSec;
        private Double remainingDistanceKm;
        private BigDecimal dispatchDistanceKm;

        // Thông tin Khách hàng
        private Long customerId;
        private String customerName;
        private String customerPhone;
        private String customerLicensePlate;

        // Thông tin Gara đảm nhận
        private Long garageId;
        private String garageName;
        private String garagePhone;
        private Double garageLat;
        private Double garageLng;

        // Thông tin Kỹ thuật viên (Nhân viên đang thực hiện đơn)
        private Long staffId;
        private String staffName;
        private String staffPhone;
        private String staffCode;
        private String rescueVehiclePlate;
        private String rescueVehicleKind;

        private OffsetDateTime createdAt;
        private OffsetDateTime enRouteAt;
        private OffsetDateTime arrivedAt;

        // Lộ trình di chuyển đã lưu trong bảng location_tracks
        private List<TrackPoint> breadcrumbs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrackPoint {
        private Double lat;
        private Double lng;
        private OffsetDateTime recordedAt;
    }
}
