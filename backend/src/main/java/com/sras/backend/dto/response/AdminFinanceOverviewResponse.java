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
public class AdminFinanceOverviewResponse {
    private Long systemBalance;
    private Long totalCommission;
    private Integer commissionRate;
    private Long pendingCount;
    private Long pendingAmount;
    private Long successfulAmount;
    private List<CommissionTransactionResponse> transactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommissionTransactionResponse {
        private Long id;
        private String orderCode;
        private String serviceTitle;
        private String garageName;
        private Long grossAmount;
        private Long commissionAmount;
        private String createdAtText;
        private String createdAt;
        private String status;
        private String technicianName;
        private String technicianPhone;
        private String customerName;
        private String customerPhone;
        private String pickupAddress;
        private String paymentMethod;
        private Long rescueFee;
        private Long towingFee;
        private Long serviceFee;
        private Double commissionRate;
        private Long employeeShare;
        private Long garageShare;
        private Long travelFee;
        private Long repairFee;
        private String quoteStatus;
    }
}
