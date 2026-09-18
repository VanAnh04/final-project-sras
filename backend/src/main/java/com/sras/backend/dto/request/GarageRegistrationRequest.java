package com.sras.backend.dto.request;

import com.sras.backend.entity.enums.Capability;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GarageRegistrationRequest {
    @NotBlank(message = "Tên Gara không được để trống")
    private String name;

    @NotBlank(message = "Số điện thoại liên hệ không được để trống")
    private String phone;

    @Email(message = "Email không hợp lệ")
    private String email;

    @NotBlank(message = "Địa chỉ kinh doanh không được để trống")
    private String address;

    private Double lat;
    private Double lng;

    private Capability capability = Capability.BOTH;

    private String idCardFrontUrl;
    private String idCardBackUrl;
    private String businessLicenseUrl;
    private String facadePhotoUrl;
}
