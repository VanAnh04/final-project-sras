package com.sras.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Gara thêm nhanh một nhân viên cứu hộ. */
@Data
public class CreateGarageStaffRequest {

    @NotBlank(message = "Vui lòng nhập tên nhân viên")
    private String fullName;

    @NotBlank(message = "Vui lòng nhập số điện thoại nhân viên")
    private String phone;
}
