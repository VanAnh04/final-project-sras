package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/** Lệnh rút tiền phía gara. Không chứa mã / thông điệp lỗi thô của cổng chi. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalResponse {
    private Long id;
    private String transferCode;
    private Long amount;
    /** PAYOUT_SENDING · PAYOUT_PROCESSING · PAYOUT_UNCERTAIN · TRANSFERRED · FAILED … */
    private String status;
    /** Trạng thái rút gọn cho UI: PROCESSING · SUCCESS · FAILED. */
    private String displayStatus;
    private String bankSnapshot;
    private OffsetDateTime createdAt;
    private OffsetDateTime payoutSettledAt;
    private String failureMessage;
}
