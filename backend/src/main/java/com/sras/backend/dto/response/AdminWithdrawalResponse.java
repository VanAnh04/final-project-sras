package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/** Lệnh rút tiền cho admin đối soát — có dữ liệu thô của cổng chi. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminWithdrawalResponse {
    private Long id;
    private String transferCode;
    private Long garageId;
    private String garageName;
    private Long amount;
    private String status;
    private String payoutMode;
    private String payoutProvider;
    private String providerPayoutId;
    private String idempotencyKey;
    private String bankSnapshot;
    private String bankBinSnapshot;
    private String bankAccountNumberSnapshot;
    private String bankAccountHolderSnapshot;
    private Short payoutAttemptCount;
    private String payoutErrorCode;
    private String payoutErrorMessage;
    private Boolean needsManualReview;
    private String reviewedByName;
    private OffsetDateTime reviewedAt;
    private String reviewNote;
    private String transferProofUrl;
    private OffsetDateTime createdAt;
    private OffsetDateTime payoutSentAt;
    private OffsetDateTime payoutSettledAt;
}
