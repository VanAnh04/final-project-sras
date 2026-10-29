package com.sras.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Hạn mức rút tiền của gara tại thời điểm gọi — client chỉ dùng để hiển thị, mọi kiểm tra vẫn chạy lại ở backend.
 * {@code blockedReason} do server tính từ chính các hàm kiểm tra của lệnh rút.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WithdrawalLimitsResponse {
    private boolean enabled;
    /** Lý do chưa rút được (không phụ thuộc số tiền); null = rút được. */
    private String blockedReason;
    private long minAmount;
    private long maxAmountPerRequest;
    private long maxAmountPerDay;
    private int maxRequestsPerDay;
    private long remainingAmountToday;
    private long remainingRequestsToday;
    /** Số dư rút được = tổng sổ cái CASH. */
    private long withdrawableBalance;
    private Long creditBalance;
    private int otpTtlMinutes;
    private int otpResendCooldownSeconds;
}
