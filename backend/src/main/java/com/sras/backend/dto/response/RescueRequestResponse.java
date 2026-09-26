package com.sras.backend.dto.response;

import com.sras.backend.entity.enums.RescueStatus;
import com.sras.backend.entity.enums.VehicleType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    private Long rescueFee;
    private Long totalAmount;
    private BigDecimal dispatchDistanceKm;
    private CustomerInfoDto customer;
    private GarageInfoDto garage;
    private StaffInfoDto staff;
    private RescueVehicleInfoDto rescueVehicle;
    private OffsetDateTime createdAt;
    private OffsetDateTime enRouteAt;
    private OffsetDateTime arrivedAt;
    private OffsetDateTime completedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerInfoDto {
        private Long id;
        private String name;
        private String phone;
        private String avatarUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GarageInfoDto {
        private Long id;
        private String name;
        private String phone;
        private String address;
        private BigDecimal avgRating;
        private Double lat;
        private Double lng;
        private String avatarUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffInfoDto {
        private Long id;
        private String name;
        private String phone;
        private String avatarUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RescueVehicleInfoDto {
        private Long id;
        private String licensePlate;
        private String vehicleKind;
    }
}
