package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletTransactionResponse {
    private Long id;
    private String walletType;
    private String type;
    private Long amount;
    private Long balanceAfter;
    private String description;
    private String refType;
    private Long refId;
    private OffsetDateTime createdAt;
}
