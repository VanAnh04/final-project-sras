package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/** Tài khoản nhận tiền của gara — số tài khoản luôn được che, chỉ hiện 4 số cuối. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankAccountResponse {
    private String bankCode;
    private String bankName;
    private String accountNumberMasked;
    private String bankAccountHolder;
    /** Đã khai báo đủ ngân hàng + STK + tên chủ TK. */
    private boolean complete;
    /** Đang khoá rút sau khi đổi STK tới thời điểm này (null = không khoá). */
    private OffsetDateTime withdrawLockedUntil;
}
