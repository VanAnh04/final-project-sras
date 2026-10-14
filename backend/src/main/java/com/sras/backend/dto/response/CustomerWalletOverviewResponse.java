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
public class CustomerWalletOverviewResponse {
    private Long balance;
    private Long totalSpent;
    private Long completedOrdersCount;
    private List<CustomerSpendingTransactionResponse> transactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerSpendingTransactionResponse {
        private Long id;
        private String orderCode;
        private String serviceTitle;
        private String garageName;
        private Long amount;
        private String paymentMethod;
        private String createdAtText;
        private String status;
    }
}
