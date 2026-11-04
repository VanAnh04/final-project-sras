package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Lưu tài khoản ngân hàng nhận tiền — bắt buộc kèm OTP đã xin cho ĐÚNG thông tin này. */
@Data
public class UpdateBankAccountRequest {
    @NotBlank(message = "Vui lòng chọn ngân hàng")
    @Size(max = 10, message = "Mã ngân hàng không hợp lệ")
    private String bankCode;

    @NotBlank(message = "Vui lòng nhập số tài khoản")
    @Size(max = 30, message = "Số tài khoản không hợp lệ")
    private String bankAccountNumber;

    @NotBlank(message = "Vui lòng nhập tên chủ tài khoản")
    @Size(max = 100, message = "Tên chủ tài khoản tối đa 100 ký tự")
    private String bankAccountHolder;

    @NotBlank(message = "Vui lòng nhập mã OTP")
    @Pattern(regexp = "[0-9]{6}", message = "Mã OTP gồm 6 chữ số")
    private String otpCode;
}
