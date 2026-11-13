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
public class StaffWalletResponse {
    private Long staffId;
    private Long walletBalance;
    private String staffName;
    private String staffCode;
    private Long garageId;
    private String garageName;
    private List<WalletTransactionResponse> transactions;
}
