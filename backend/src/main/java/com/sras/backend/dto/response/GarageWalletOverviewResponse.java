package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GarageWalletOverviewResponse {
    private Long cashBalance;
    private Long creditBalance;
    private Long todayIncome;
    private Long todayOrdersCount;
    private Long pendingOrdersCount;
    private Long sevenDaysTotal;
    private List<DailyRevenuePoint> sevenDaysChart;
    private List<DailyRevenuePoint> monthlyChart;
    private List<DailyRevenuePoint> yearlyChart;
    private List<GarageOrderTransactionResponse> transactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRevenuePoint {
        private String dayLabel;
        private Long amount;
        private Boolean isToday;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GarageOrderTransactionResponse {
        private Long id;
        private String orderCode;
        private String technicianName;
        private String technicianAvatar;
        private String executedAtText;
        private Long amount;
        private String status;
        private String serviceTitle;
        private String paymentMethod;
        private Long totalOrderAmount;
        private Long commissionAmount;
        private Double commissionRate;
        private String txnType;
        private String description;
        private OffsetDateTime createdAt;
    }
}
