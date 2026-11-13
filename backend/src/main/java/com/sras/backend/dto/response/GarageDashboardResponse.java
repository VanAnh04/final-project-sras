package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageDashboardResponse {
    private String garageName;
    private Boolean isOnline;
    private Boolean autoAccept;
    private Long todayRevenue;
    private Double revenueGrowthPercent;
    private Integer availableStaffCount;
    private Integer busyStaffCount;
    private Integer activeOrderCount;
    private Integer completedOrderCount;

    /** Số dư ví tín dụng (escrow khấu trừ hoa hồng) */
    private Long creditBalance;
    /** Số dư ví tiền mặt (doanh thu có thể rút) */
    private Long cashBalance;
    /** Trạng thái đủ điều kiện nhận đơn (creditBalance >= 500.000 VNĐ) */
    private Boolean isWalletEligible;

    private List<StaffLocation> onlineStaffLocations;
    private List<PendingRescueOrder> pendingOrders;
    private List<RecentServiceItem> recentServices;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffLocation {
        private Long id;
        private String name;
        private String phone;
        private Double lat;
        private Double lng;
        private Boolean isAvailable;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PendingRescueOrder {
        private Long id;
        private String orderType;
        private String customerVehicle;
        private String issueDescription;
        private String timeAgo;
        private Boolean isUrgent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentServiceItem {
        private Long id;
        private String customerName;
        private String licensePlate;
        private String serviceName;
        private String technicianName;
        private String status;
    }
}
