package com.sras.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Gara thêm một nhân viên cứu hộ (tạo luôn tài khoản đăng nhập bằng email + mật khẩu). */
@Data
public class CreateGarageStaffRequest {

    @NotBlank(message = "Vui lòng nhập tên nhân viên")
    private String fullName;

    @NotBlank(message = "Vui lòng nhập số điện thoại nhân viên")
    private String phone;

    @NotBlank(message = "Vui lòng nhập email để nhân viên đăng nhập")
    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Vui lòng nhập mật khẩu")
    @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
    private String password;

    /** Ảnh mặt nhân viên (URL đã upload). Tuỳ chọn. */
    private String avatarUrl;
}
