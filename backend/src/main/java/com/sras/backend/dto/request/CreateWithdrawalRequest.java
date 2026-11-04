package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/** Tạo lệnh rút tiền về ngân hàng. */
@Data
public class CreateWithdrawalRequest {
    @NotNull(message = "Vui lòng nhập số tiền rút")
    @Positive(message = "Số tiền rút phải lớn hơn 0")
    private Long amount;

    @NotBlank(message = "Vui lòng nhập mã OTP")
    @Pattern(regexp = "[0-9]{6}", message = "Mã OTP gồm 6 chữ số")
    private String otpCode;
}
