package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AddGarageStaffRequest {

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^(0|\\+84)[0-9]{9}$", message = "Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số (VD: 0912345678)")
    private String phone;

    @NotBlank(message = "Họ và tên nhân viên không được để trống")
    @Size(min = 2, max = 100, message = "Họ và tên phải từ 2 đến 100 ký tự")
    private String fullName;

    @Size(max = 20, message = "Mã nhân viên tối đa 20 ký tự")
    private String staffCode;
}
