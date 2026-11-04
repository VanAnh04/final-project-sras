package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/** Xin OTP cho một lệnh rút — mã chỉ dùng được cho đúng số tiền này. */
@Data
public class WithdrawalOtpRequest {
    @NotNull(message = "Vui lòng nhập số tiền rút")
    @Positive(message = "Số tiền rút phải lớn hơn 0")
    private Long amount;
}
